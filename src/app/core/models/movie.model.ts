export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date: string;
  runtime?: number; // Duración en minutos
  genres?: { id: number; name: string }[]; // Lista de géneros (Ej: Acción, Comedia)
}

export interface MovieResponse {
  results: Movie[]; // La API nos devuelve una lista de películas
  page: number;
  total_pages: number;
}
