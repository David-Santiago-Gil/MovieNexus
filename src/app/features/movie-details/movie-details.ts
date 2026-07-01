import { Component, inject, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieService } from '../../core/services/movie.service';
import { Movie, CountryProviders } from '../../core/models/movie.model';
import { CastCard } from '../../shared/components/cast-card/cast-card';
import { MovieTrailer } from './components/movie-trailer/movie-trailer';
import { MovieComments } from './components/movie-comments/movie-comments';
import { Observable, forkJoin } from 'rxjs';
import { CreditsResponse } from '../../core/models/cast.model';
import { FavoritesService } from '../../core/services/favorites.service';

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [CommonModule, CastCard, MovieTrailer, MovieComments],
  templateUrl: './movie-details.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './movie-details.css',
})
export class MovieDetails implements OnInit {
  private movieService = inject(MovieService);
  public favoritesService = inject(FavoritesService);
  @Input() id!: string;

  // Observable con TODOS los datos: detalles, créditos y proveedores de streaming
  movieData$!: Observable<{ details: Movie; credits: CreditsResponse; providers: CountryProviders | null }>;

  ngOnInit(): void {
    if (this.id) {
      // Detectar región del usuario de forma dinámica desde navigator.language
      const userRegion = this.getUserRegion();

      // forkJoin dispara las tres peticiones al mismo tiempo
      this.movieData$ = forkJoin({
        details: this.movieService.getMovieById(this.id),
        credits: this.movieService.getMovieCredits(this.id),
        providers: new Observable<CountryProviders | null>((observer) => {
          this.movieService.getWatchProviders(this.id).subscribe({
            next: (res) => {
              // Intentar con la región detectada, luego 'US' como respaldo
              const countryData = res.results?.[userRegion] ?? res.results?.['US'] ?? null;
              observer.next(countryData);
              observer.complete();
            },
            error: () => {
              observer.next(null);
              observer.complete();
            },
          });
        }),
      });
    }
  }

  /**
   * Detecta la región del usuario basándose en navigator.language.
   * Ejemplos: 'es-CO' → 'CO', 'en-US' → 'US', 'es' → 'ES'
   */
  private getUserRegion(): string {
    if (typeof window === 'undefined') return 'US'; // Guard para SSR
    const lang = navigator.language || 'en-US';
    const parts = lang.split('-');
    return parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase();
  }

  getBackdropUrl(path: string | null | undefined): string {
    return path ? `https://image.tmdb.org/t/p/original${path}` : '';
  }

  getProviderLogoUrl(logoPath: string): string {
    return `https://image.tmdb.org/t/p/w92${logoPath}`;
  }

  toggleFavorite(movie: Movie): void {
    this.favoritesService.toggleFavorite(movie);
  }
}
