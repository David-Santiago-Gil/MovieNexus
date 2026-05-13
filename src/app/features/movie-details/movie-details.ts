import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieService } from '../../core/services/movie.service';
import { Movie } from '../../core/models/movie.model';
import { CastCard } from '../../shared/components/cast-card/cast-card';
import { Observable, forkJoin } from 'rxjs'; // Importamos RxJS
import { CreditsResponse } from '../../core/models/cast.model';

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [CommonModule, CastCard], // No olvides importar CastCard
  templateUrl: './movie-details.html',
  styleUrl: './movie-details.css'
})
export class MovieDetails implements OnInit {
  private movieService = inject(MovieService);
  @Input() id!: string;

  // Declaramos un Observable que contendrá TODOS los datos que necesitamos
  movieData$!: Observable<{ details: Movie; credits: CreditsResponse }>;

  ngOnInit(): void {
    if (this.id) {
      // forkJoin dispara ambas peticiones al mismo tiempo y crea un objeto con los dos resultados
      this.movieData$ = forkJoin({
        details: this.movieService.getMovieById(this.id),
        credits: this.movieService.getMovieCredits(this.id)
      });
    }
  }

  getBackdropUrl(path: string | null | undefined): string {
    return path ? `https://image.tmdb.org/t/p/original${path}` : '';
  }
}
