import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  // Rutas públicas (Login / Registro)
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent)
  },

  // Rutas internas con Layout Fijo (Navbar persistente)
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: 'courses',
        loadComponent: () => import('./features/courses/pages/course-page/courses-page').then(m => m.CoursesPageComponent)
      },
      {
        path: 'courses/grades',
        loadComponent: () => import('./features/courses/pages/grades-page/grades-pages').then(m  => m.GradesPageComponent)
      },
      {
        path: '',
        redirectTo: 'courses',
        pathMatch: 'full'
      }
    ]
  },

  {
    path: '**',
    redirectTo: 'courses'
  }
];