import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie } from '../../../../core/models/movie.model';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './hero.css',
})
export class Hero {
  // ¡Recibimos la película desde el padre (Home)!
  // 'required: true' obliga a que no se pueda usar <app-hero> sin pasarle una película
  @Input({ required: true }) movie!: Movie;

  // Getter profesional para construir la URL de la imagen de fondo de alta calidad
  get backdropUrl() {
    return this.movie.backdrop_path
      ? `https://image.tmdb.org/t/p/original${this.movie.backdrop_path}`
      : ''; // URL de respaldo si es necesario
  }
}
