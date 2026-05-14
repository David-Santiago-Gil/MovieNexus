import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Movie } from '../../../core/models/movie.model';
import { FavoritesService } from '../../../core/services/favorites.service';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './movie-card.html',
  styleUrl: './movie-card.css'
})
export class MovieCard {
  // Obligamos a que el componente padre SIEMPRE pase una película
  @Input({ required: true }) movie!: Movie;

  private favoritesService = inject(FavoritesService);

  get isFavorite(): boolean {
    return this.favoritesService.isFavorite(this.movie.id);
  }

  toggleFavorite(event: Event) {
    event.preventDefault(); // Evita navegar al detalle al dar click al corazón
    event.stopPropagation();
    this.favoritesService.toggleFavorite(this.movie);
  }

  // Getter para construir la URL completa de la imagen de TMDB
  get posterUrl() {
    return this.movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${this.movie.poster_path}`
      : 'assets/no-poster.png'; // Fallback por si no hay imagen
  }
}