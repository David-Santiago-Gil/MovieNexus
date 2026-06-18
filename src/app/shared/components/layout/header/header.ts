import { Component, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MovieService } from '../../../../core/services/movie.service';
import { Movie } from '../../../../core/models/movie.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './header.css',
})
export class Header {
  private movieService = inject(MovieService);

  // 1. Declaramos nuestras Signals
  searchQuery = signal(''); // Lo que el usuario escribe
  searchResults = signal<Movie[]>([]); // Los resultados que llegan de la API
  isSearching = signal(false); // Para mostrar un spinner de carga

  constructor() {
    // 2. El effect: Ejecuta automáticamente cuando searchQuery cambia
    effect((onCleanup) => {
      const query = this.searchQuery();

      // Si la query está vacía, no buscamos (ahorramos peticiones)
      if (query.length < 3) {
        this.searchResults.set([]);
        this.isSearching.set(false);
        return;
      }

      this.isSearching.set(true);

      // 3. El "Debounce": Activamos la búsqueda SOLO
      // ¿Por qué? Si el usuario escribe "Batman" muy rápido (6 letras),
      const timeoutId = setTimeout(() => {
        this.movieService.searchMovies(query).subscribe({
          next: (response) => {
            // Tomamos los primeros 5 resultados para no llenar la pantalla
            this.searchResults.set(response.results.slice(0, 5));
            this.isSearching.set(false);
          },
          error: () => this.isSearching.set(false),
        });
      }, 300);

      // 4. Limpieza: Si el usuario escribe OTRA letra antes de los 300ms,
      // el anterior 'setTimeout' quiere quedar ejecutar
      onCleanup(() => clearTimeout(timeoutId));
    });
  }

  // Método para actualizar el valor para actualizar la Signal
  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  // Método para cerrar el buscador al hacer clic en un resultado
  closeSearch() {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }
}
