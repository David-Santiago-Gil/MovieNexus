import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../../../core/services/comment.service';
import { Comment } from '../../../../core/models/comment.model';

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
    this.commentService.getComments(this.itemId).subscribe({
      next: (data) => {
        this.comments = data.sort(
          (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );
        this.loading = false;
        this.cdr.markForCheck(); // Notifica a Angular que el estado cambió
      },
      error: () => {
        this.error = 'No se pudieron cargar los comentarios. Asegúrate de que la API está activa.';
        this.loading = false;
        this.cdr.markForCheck();
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

    this.commentService.addComment(
      this.itemId,
      this.authorName.trim(),
      this.commentText.trim(),
      this.selectedRating
    ).subscribe({
      next: (newComment) => {
        this.comments.unshift(newComment);
        this.authorName = '';
        this.commentText = '';
        this.selectedRating = 5;
        this.showForm = false;
        this.submitting = false;
        this.successMessage = '¡Comentario publicado exitosamente! ✅';
        this.cdr.markForCheck(); // Actualiza la vista inmediatamente tras publicar
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck(); // Limpia el banner de éxito en la vista
        }, 3000);
      },
      error: () => {
        this.submitting = false;
        this.error = 'Error al publicar. Reintenta de nuevo.';
        this.cdr.markForCheck();
      }
    });
  }
}
