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

  isOpen    = signal(false);
  userInput = signal('');
  movieResults = signal<Record<string, any[]>>({});
  isListening  = signal(false);

  private shouldScrollToBottom = false;

  // ── Web Speech API ──────────────────────────────────────────────────────────
  private recognition: any = null;

  /** Texto acumulado de sesiones previas (cada onend resetea la sesión interna) */
  private accumulatedText = '';

  /** Timer para auto-envío después de silencio prolongado */
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  /** Timer para reiniciar el recognition con un pequeño delay */
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Tiempo de silencio tras el ÚLTIMO resultado de voz antes de auto-enviar.
   * 3000 ms = 3 segundos — suficiente para pausas naturales entre palabras.
   */
  private readonly SILENCE_AFTER_SPEECH_MS = 3000;

  /** Pequeño delay antes de reiniciar la sesión (evita el error "already started") */
  private readonly RESTART_DELAY_MS = 200;

  constructor() {
    this.initSpeechRecognition();
  }

  // ── Inicialización ───────────────────────────────────────────────────────────

  /**
   * Inicializa el SpeechRecognition.
   * Guard `typeof window === 'undefined'` protege el entorno SSR.
   *
   * Usamos continuous = FALSE porque en Chrome/Edge es más fiable:
   * cada "frase" dispara onend y nosotros reiniciamos manualmente.
   * Así el micrófono nunca se corta inesperadamente para el usuario.
   */
  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    this.recognition = new SR();
    this.recognition.continuous      = false;  // más fiable en Chrome
    this.recognition.interimResults  = true;   // texto en tiempo real
    this.recognition.lang            = navigator.language || 'es-ES';
    this.recognition.maxAlternatives = 1;

    // ── onresult: texto detectado ───────────────────────────────────────────
    this.recognition.onresult = (event: any) => {
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

      if (finalTxt) {
        // Añadir al texto acumulado cuando el segmento es definitivo
        this.accumulatedText = (this.accumulatedText + ' ' + finalTxt).trim();
      }

      // Mostrar en el input: texto acumulado + lo que se está detectando ahora
      const display = interim
        ? (this.accumulatedText + ' ' + interim).trim()
        : this.accumulatedText;

      if (display) {
        this.userInput.set(display);
      }

      // Reiniciar el timer de silencio cada vez que llegue voz
      this.resetSilenceTimer();
    };

    // ── onend: el navegador cerró la sesión (ocurre siempre tras una frase) ──
    this.recognition.onend = () => {
      if (!this.isListening()) return; // El usuario lo cerró manualmente → no reiniciar

      // Reiniciar con un pequeño delay para que el navegador libere el micrófono
      this.scheduleRestart();
    };

    // ── onerror ─────────────────────────────────────────────────────────────
    this.recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // Sin voz detectada: onend se disparará igual y reiniciará → ignorar
        return;
      }
      if (event.error === 'aborted') {
        // Abortado por nosotros (stopListening) → ignorar
        return;
      }
      // Error real: detener
      console.warn('SpeechRecognition error:', event.error);
      this.hardStop();
    };
  }

  // ── Reinicio automático ──────────────────────────────────────────────────────

  private scheduleRestart(): void {
    this.clearRestartTimer();
    this.restartTimer = setTimeout(() => {
      if (!this.isListening()) return;
      try {
        this.recognition.start();
      } catch {
        // Si falla (ej: permiso revocado), detenemos
        this.hardStop();
      }
    }, this.RESTART_DELAY_MS);
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
    }, this.SILENCE_AFTER_SPEECH_MS);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  // ── API pública del micrófono ─────────────────────────────────────────────────

  toggleMicrophone(): void {
    if (!this.recognition) return;
    this.isListening() ? this.stopListening() : this.startListening();
  }

  private startListening(): void {
    this.accumulatedText = ''; // Limpiar acumulado de la sesión anterior
    try {
      this.recognition.start();
      this.isListening.set(true);
    } catch (e) {
      console.warn('Error al iniciar SpeechRecognition:', e);
    }
  }

  /** Detiene la grabación y cancela todos los timers */
  private stopListening(): void {
    this.isListening.set(false); // Marcar ANTES de llamar stop() para que onend no reinicie
    this.clearSilenceTimer();
    this.clearRestartTimer();
    try { this.recognition.abort(); } catch { /* ya detenido */ }
    this.accumulatedText = '';
  }

  /** Detiene sin limpiar accumulatedText (usado en errores) */
  private hardStop(): void {
    this.isListening.set(false);
    this.clearSilenceTimer();
    this.clearRestartTimer();
    try { this.recognition.abort(); } catch { /* ya detenido */ }
    this.accumulatedText = '';
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
