import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  movies?: string[];
}

export interface GeminiResponse {
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly API_URL = '/api/chat';

  // Estado reactivo con Signals
  private _messages = signal<ChatMessage[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly messages = this._messages.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMessages = computed(() => this._messages().length > 0);

  constructor(private http: HttpClient) {
    this.initWelcomeMessage();
  }

  private initWelcomeMessage(): void {
    const welcomeMsg: ChatMessage = {
      role: 'model',
      text: `¡Hola! 👋 Soy **David**, tu asistente personal de **MovieNexus**.\n\n🎬 Estoy aquí para ayudarte a descubrir películas increíbles, hablar sobre directores, actores y recomendarte lo mejor del cine mundial.\n\n¿Qué tipo de película tienes ganas de ver hoy? 🍿`,
      timestamp: new Date(),
    };
    this._messages.set([welcomeMsg]);
  }

  async sendMessage(userText: string): Promise<void> {
    if (!userText.trim() || this._loading()) return;

    // Agregar mensaje del usuario
    const userMsg: ChatMessage = {
      role: 'user',
      text: userText.trim(),
      timestamp: new Date(),
    };
    this._messages.update((msgs) => [...msgs, userMsg]);
    this._loading.set(true);
    this._error.set(null);

    // Construir historial para la API (excluir el mensaje de bienvenida y el último user msg)
    const historyForApi = this._messages()
      .slice(1, -1) // Excluir bienvenida y el msg que acabamos de agregar
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const response = await firstValueFrom(
        this.http.post<GeminiResponse>(this.API_URL, {
          message: userText.trim(),
          history: historyForApi,
        })
      );

      const rawText = response?.text || 'No pude obtener una respuesta. ¡Inténtalo de nuevo!';

      // Extraer movies del bloque especial |||MOVIES:[...]|||
      const movies = this.extractMovies(rawText);
      const cleanText = rawText.replace(/\|\|\|MOVIES:\[.*?\]\|\|\|/s, '').trim();

      const modelMsg: ChatMessage = {
        role: 'model',
        text: cleanText,
        timestamp: new Date(),
        movies: movies.length > 0 ? movies : undefined,
      };

      this._messages.update((msgs) => [...msgs, modelMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      this._error.set('Error al conectar con el asistente. Verifica tu conexión.');
      const errorMsg: ChatMessage = {
        role: 'model',
        text: '❌ Ocurrió un error al procesar tu mensaje. Por favor, inténtalo de nuevo.',
        timestamp: new Date(),
      };
      this._messages.update((msgs) => [...msgs, errorMsg]);
    } finally {
      this._loading.set(false);
    }
  }

  private extractMovies(text: string): string[] {
    const match = text.match(/\|\|\|MOVIES:\[(.*?)\]\|\|\|/s);
    if (!match) return [];
    try {
      return JSON.parse(`[${match[1]}]`) as string[];
    } catch {
      return [];
    }
  }

  clearHistory(): void {
    this._messages.set([]);
    this.initWelcomeMessage();
  }
}
