import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieService } from '../../core/services/movie.service';
import { Movie } from '../../core/models/movie.model';

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './movie-details.html',
  styleUrl: './movie-details.css'
})
export class MovieDetails implements OnInit {
  private movieService = inject(MovieService);

  // Angular llenará esto automáticamente con el valor de :id de la URL
  @Input() id!: string;

  movie = signal<Movie | null>(null);

  ngOnInit(): void {
    this.movieService.getMovieById(this.id).subscribe({
      next: (movie) => this.movie.set(movie)
    });
  }
}
