import { Component, inject } from '@angular/core';
import { FavoritesService } from '../../core/services/favorites.service';
import { MovieCard } from '../../shared/components/movie-card/movie-card';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [MovieCard, RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class Favorites {
  // Inyectamos el servicio para acceder a los favoritos
  public favoritesService = inject(FavoritesService);

  // Creamos un getter para facilitar el acceso en el HTML
  get favoriteMovies() {
    return this.favoritesService.favorites();
  }
}
