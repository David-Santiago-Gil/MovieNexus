import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then(m => m.Home),
    title: 'Home | MovieNexus'
  },
  {
    path: 'movie/:id', // :id es el parámetro dinámico
    loadComponent: () => import('./features/movie-details/movie-details').then(m => m.MovieDetails)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
