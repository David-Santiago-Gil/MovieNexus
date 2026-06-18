import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../../../core/services/comment.service';
import { Comment } from '../../../../core/models/comment.model';
import { finalize, timeout } from 'rxjs';

@Component({
  selector: 'app-movie-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movie-comments.html',
  styleUrl: './movie-comments.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovieComments implements OnInit {
  private commentService = inject(CommentService);
  private cdr = inject(ChangeDetectorRef);

  @Input() movieId!: number; // Recibe el ID desde la pantalla de detalles

  comments: Comment[] = [];
  loading = false;
  error = '';
  submitting = false;

  // Campos del formulario
  authorName = '';
  commentText = '';
  selectedRating = 5;
  showForm = false;
  successMessage = '';

  get itemId(): string {
    return `movie-${this.movieId}`;
  }

  ngOnInit(): void {
    this.loadComments();
  }

  loadComments(): void {
    this.loading = true;
    this.error = '';
    this.commentService.getComments(this.itemId).pipe(
      timeout(10000),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (data) => {
        this.comments = data.sort(
          (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );
      },
      error: () => {
        this.error = 'No se pudieron cargar los comentarios. Asegúrate de que la API está activa.';
      }
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.successMessage = '';
  }

  setRating(value: number): void {
    this.selectedRating = value;
  }

  submitComment(): void {
    if (!this.authorName.trim() || !this.commentText.trim()) return;
    this.submitting = true;
    this.error = '';
    this.cdr.markForCheck();

    this.commentService.addComment(
      this.itemId,
      this.authorName.trim(),
      this.commentText.trim(),
      this.selectedRating
    ).pipe(
      timeout(10000),  // Si en 10s no hay respuesta, fuerza el error
      finalize(() => {
        // Siempre se ejecuta: tanto en éxito como en error
        this.submitting = false;
        this.cdr.markForCheck(); // Garantiza que el botón salga del estado "Enviando..."
      })
    ).subscribe({
      next: (newComment) => {
        this.comments.unshift(newComment);
        this.authorName = '';
        this.commentText = '';
        this.selectedRating = 5;
        this.showForm = false;
        this.successMessage = '¡Comentario publicado exitosamente! ✅';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 3000);
      },
      error: () => {
        this.error = 'Error al publicar. Reintenta de nuevo.';
      }
    });
  }
}
