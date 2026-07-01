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

// --- Interfaces para plataformas de streaming (TMDB Watch Providers) ---
export interface WatchProvider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface CountryProviders {
  link?: string;
  flatrate?: WatchProvider[]; // Suscripción
  buy?: WatchProvider[];       // Compra
  rent?: WatchProvider[];      // Renta
}

export interface WatchProvidersResponse {
  id: number;
  results: Record<string, CountryProviders>;
}
