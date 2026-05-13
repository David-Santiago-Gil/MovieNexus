export interface CastMember {
  id: number;
  name: string;
  character: string; // El nombre del personaje en la película
  profile_path: string | null; // La foto del actor
}

export interface CreditsResponse {
  id: number;
  cast: CastMember[]; // La lista de actores
}
