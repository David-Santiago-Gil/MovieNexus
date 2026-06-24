import {
  Component,
  inject,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectionStrategy,
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
export class ChatWidget implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  geminiService: GeminiService = inject(GeminiService);
  movieService: MovieService = inject(MovieService);


  isOpen = signal(false);
  userInput = signal('');
  movieResults = signal<Record<string, any[]>>({});
  private shouldScrollToBottom = false;

  toggleChat(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.shouldScrollToBottom = true;
    }
  }

  closeChat(): void {
    this.isOpen.set(false);
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
    // Soporte básico de Markdown: **bold**, *italic*, saltos de línea
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

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
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
