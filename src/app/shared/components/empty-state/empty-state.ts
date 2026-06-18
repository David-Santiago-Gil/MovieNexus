import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink], // Importamos RouterLink para el botón de acción
  templateUrl: './empty-state.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './empty-state.css',
})
export class EmptyStateComponent {
  icon = input<string>('🔍'); // Ícono por defecto
  image = input<string>(); // Imagen opcional (reemplaza el ícono si se proporciona)
  title = input<string>('No hay resultados');
  message = input<string>('Intenta realizar otra búsqueda.');

  // Parámetros opcionales para un botón (pueden venir o no)
  actionText = input<string>();
  actionLink = input<string>();
}
