export interface Comment {
  id?: number;         // Generado automáticamente por el servidor
  appId: string;       // Identificador único de tu aplicación (ej: 'MovieNexus-David-Gil')
  itemId: string;      // ID del elemento que se comenta (ej: 'movie-101')
  author: string;      // Nombre del alumno/usuario
  text: string;        // Contenido del comentario
  rating: number;      // Nota del 1 al 5
  createdAt?: string;  // Fecha de creación generada en el servidor
}
