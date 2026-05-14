import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Movie } from '../models/movie.model';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private platformId = inject(PLATFORM_ID);
  private readonly STORAGE_KEY = 'movienexus_favorites';

  // Nuestra "fuente de la verdad" reactiva
  public favorites = signal<Movie[]>([]);

  constructor() {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    // IMPORTANTE: Solo leemos localStorage si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) this.favorites.set(JSON.parse(stored));
    }
  }

  toggleFavorite(movie: Movie): void {
    const isAlreadyFavorite = this.favorites().some(f => f.id === movie.id);
    const updated = isAlreadyFavorite
      ? this.favorites().filter(f => f.id !== movie.id)
      : [movie, ...this.favorites()];

    this.favorites.set(updated);

    // Guardamos en disco (localStorage)
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    }
  }

  isFavorite(movieId: number): boolean {
    return this.favorites().some(f => f.id === movieId);
  }
}
