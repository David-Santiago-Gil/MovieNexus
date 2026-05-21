import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MovieResponse, Movie } from '../models/movie.model';
import { CreditsResponse } from '../models/cast.model';
//import { delay } from 'rxjs/operators'; // Descomentar para probar Skeleton Loaders

@Injectable({ providedIn: 'root' })
export class MovieService {
  private http = inject(HttpClient);
  private apiUrl = environment.baseUrl;

  getTrendingMovies() {
    return this.http.get<MovieResponse>(`${this.apiUrl}/trending/movie/day`);
  }

  /**
   * Obtiene las películas populares con soporte para paginación.
   */
  getPopularMovies(page: number = 1) {
    return this.http.get<MovieResponse>(`${this.apiUrl}/movie/popular`, {
      params: { page: page.toString() }
    })
      // .pipe(delay(2000)) // <--- Descomenta esta línea para simular lentitud y ver los Skeleton Loaders
      ;
  }

  getMovieById(id: string | number) {
    return this.http.get<Movie>(`${this.apiUrl}/movie/${id}`);
  }

  getMovieCredits(id: string | number) {
    return this.http.get<CreditsResponse>(`${this.apiUrl}/movie/${id}/credits`);
  }

  /**
   * Busca películas por término de búsqueda.
   * @param query Texto a buscar
   */
  searchMovies(query: string) {
    return this.http.get<MovieResponse>(`${this.apiUrl}/search/movie`, {
      params: { query } // Angular convierte esto en ?query=Batman automáticamente
    });
  }

  /**
   * Obtiene los videos (tráilers, teasers, etc.) de una película.
   * @param id ID de la película en TMDB
   */
  getMovieVideos(id: string | number) {
    return this.http.get<{ results: Array<{ key: string; site: string; type: string; name: string }> }>(
      `${this.apiUrl}/movie/${id}/videos`
    );
  }
}