import {
  Component,
  inject,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectionStrategy,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ChatMessage } from '../../../core/services/gemini.service';
import { MovieService } from '../../../core/services/movie.service';
import { RouterModule } from '@angular/router';
import { MovieCard } from '../movie-card/movie-card';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MovieCard],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ChatWidget implements AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  geminiService: GeminiService = inject(GeminiService);
  movieService: MovieService = inject(MovieService);

  isOpen       = signal(false);
  userInput    = signal('');
  movieResults = signal<Record<string, any[]>>({});
  isListening  = signal(false);
  micError     = signal<string | null>(null);

  private shouldScrollToBottom = false;

  // ── Web Speech API ──────────────────────────────────────────────────────────
  private recognition: any = null;

  /** Texto acumulado de resultados finales durante la sesión de voz */
  private accumulatedText = '';

  /** Timer de silencio: auto-envía tras 3 s sin voz */
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  /** Timer de reinicio (con delay para que el navegador libere el mic) */
  private restartTimer:  ReturnType<typeof setTimeout> | null = null;

  /** Máximo de intentos consecutivos de reinicio antes de rendirse */
  private retryCount = 0;
  private readonly MAX_RETRIES = 8;

  /** Milisegundos de silencio antes de auto-enviar */
  private readonly SILENCE_MS = 3000;
  /** Delay base de reinicio (se multiplica con retryCount para backoff) */
  private readonly BASE_RESTART_MS = 300;

  constructor() {}

  // ── API pública del micrófono ─────────────────────────────────────────────────

  toggleMicrophone(): void {
    if (this.isListening()) {
      this.stopListening();
    } else {
      this.micError.set(null);
      this.accumulatedText = '';
      this.retryCount = 0;
      this.isListening.set(true);
      this.activateSpeechRecognition();
    }
  }

  /**
   * Inicializa y arranca la SpeechRecognition recreándola desde cero cada vez.
   * Esto elimina por completo los bloqueos de estado del navegador ("already started" o locks internos).
   */
  private activateSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    const SR =
      (window as any).SpeechRecognition ??
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      this.micError.set('Reconocimiento de voz no soportado en este navegador.');
      this.isListening.set(false);
      return;
    }

    // Detener cualquier instancia previa existente por seguridad
    try {
      if (this.recognition) {
        this.recognition.abort();
      }
    } catch {}

    try {
      this.recognition = new SR();
      this.recognition.continuous     = true;   // Escucha continua
      this.recognition.interimResults = true;   // Texto en tiempo real
      this.recognition.lang           = navigator.language || 'es-ES';
      this.recognition.maxAlternatives = 1;

      // ── onstart: el micrófono está escuchando ──────────────────────────────
      this.recognition.onstart = () => {
        this.isListening.set(true);
      };

      // ── onresult: procesando voz en tiempo real ───────────────────────────
      this.recognition.onresult = (event: any) => {
        this.retryCount = 0; // Se recibió voz con éxito -> Resetear contador de reintentos

        let interim  = '';
        let finalTxt = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTxt += t;
          } else {
            interim += t;
          }
        }

        // Acumular los fragmentos que ya son definitivos
        if (finalTxt) {
          this.accumulatedText = (this.accumulatedText + ' ' + finalTxt).trim();
        }

        // Mostrar el texto final acumulado + el fragmento que se está procesando
        const display = interim
          ? (this.accumulatedText + ' ' + interim).trim()
          : this.accumulatedText;

        if (display) {
          this.userInput.set(display);
          this.resetSilenceTimer(); // Reiniciar el temporizador para no enviar antes de tiempo
        }
      };

      // ── onend: el navegador desconectó el micrófono ────────────────────────
      this.recognition.onend = () => {
        if (this.isListening()) {
          this.scheduleRestart(); // Re-instanciar automáticamente
        }
      };

      // ── onerror: manejo robusto de excepciones de la API ──────────────────
      this.recognition.onerror = (event: any) => {
        // 'no-speech' y 'aborted' son normales cuando hay pausas largas o cancelaciones
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }

        console.warn('SpeechRecognition error:', event.error);

        // Mostrar mensajes descriptivos al usuario
        if (event.error === 'not-allowed') {
          this.micError.set('Permiso de micrófono denegado. Actívalo en la barra del navegador.');
        } else if (event.error === 'audio-capture') {
          this.micError.set('No se detectó un micrófono activo en tu dispositivo.');
        } else {
          this.micError.set(`Error de micrófono: ${event.error}`);
        }
        this.hardStop();
      };

      this.recognition.start();
    } catch (e) {
      console.warn('Error instanciando o iniciando SpeechRecognition:', e);
      this.micError.set('No se pudo abrir el servicio de micrófono.');
      this.hardStop();
    }
  }

  // ── Reinicio automático con backoff exponencial ──────────────────────────────

  private scheduleRestart(): void {
    if (this.retryCount >= this.MAX_RETRIES) {
      this.hardStop();
      return;
    }

    this.clearRestartTimer();

    // Retardo progresivo: 300ms, 600ms, 900ms, 1200ms...
    const delay = this.BASE_RESTART_MS * (this.retryCount + 1);

    this.restartTimer = setTimeout(() => {
      if (!this.isListening()) return;
      this.retryCount++;
      this.activateSpeechRecognition(); // Re-crear y arrancar
    }, delay);
  }

  private clearRestartTimer(): void {
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  // ── Timer de silencio (auto-envío) ───────────────────────────────────────────

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      const text = this.userInput().trim();
      if (text && !this.geminiService.loading()) {
        this.stopListening();
        this.onSend();
      }
    }, this.SILENCE_MS);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /** Detiene de forma controlada */
  private stopListening(): void {
    this.isListening.set(false);
    this.clearSilenceTimer();
    this.clearRestartTimer();
    this.accumulatedText = '';
    try {
      if (this.recognition) {
        this.recognition.abort();
      }
    } catch {}
  }

  /** Detiene inmediatamente por error sin limpiar la interfaz de forma abrupta */
  private hardStop(): void {
    this.isListening.set(false);
    this.clearSilenceTimer();
    this.clearRestartTimer();
    this.accumulatedText = '';
    try {
      if (this.recognition) {
        this.recognition.abort();
      }
    } catch {}
  }

  // ── Resto del componente ──────────────────────────────────────────────────────

  toggleChat(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) this.shouldScrollToBottom = true;
  }

  closeChat(): void {
    this.isOpen.set(false);
    if (this.isListening()) this.stopListening();
  }

  async onSend(): Promise<void> {
    const text = this.userInput().trim();
    if (!text || this.geminiService.loading()) return;
    this.userInput.set('');
    this.shouldScrollToBottom = true;
    await this.geminiService.sendMessage(text);
    this.shouldScrollToBottom = true;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  clearChat(): void {
    this.geminiService.clearHistory();
    this.movieResults.set({});
  }

  formatText(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  getMoviePosterUrl(movie: any): string {
    return movie?.poster_path
      ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
      : 'assets/no-poster.png';
  }

  trackByIndex(index: number, _item: ChatMessage): number {
    return index;
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.hardStop();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch { }
  }

  get suggestedQuestions(): string[] {
    return [
      '🎬 Recomiéndame películas de acción',
      '🏆 ¿Cuáles son las mejores películas del 2024?',
      '😂 Quiero ver algo de comedia',
      '👻 Películas de terror imperdibles',
    ];
  }

  sendSuggestion(question: string): void {
    this.userInput.set(question);
    this.onSend();
  }
}
