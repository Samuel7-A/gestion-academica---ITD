import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  // Rutas públicas (Login / Registro)
  {
    path:'',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },

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
    path: 'principal',
    component: MainLayoutComponent,
    children: [
      {
        path: 'courses',
        loadComponent: () => import('./features/pages/course-page/courses-page').then(m => m.CoursesPageComponent)
      },
      {
        path: 'courses/grades',
        loadComponent: () => import('./features/pages/grades-page/grades-pages').then(m  => m.GradesPageComponent)
      },
      {
        path: 'courses/performance',
        loadComponent:() => import('./features/pages/grades-performance/grades-performance').then(m => m.GradesPerformanceComponent)
      },
      {
        path: 'courses/exams',
        loadComponent: () => import('./features/pages/exams-page/exams-page').then(m => m.ExamsPageComponent)
      },
      {
        path: 'courses/reports',
        loadComponent: () => import('./features/pages/reports-page/reports-page').then(m => m.ReportsPageComponent)
      },
      {
        path: 'courses/risks',
        loadComponent: () => import('./features/pages/risks-page/risks-page').then(m => m.RisksPageComponent)
      },
      {
        path: '',
        redirectTo: 'courses',
        pathMatch: 'full'
      }
    ]
  },

  { path: 'courses', redirectTo: 'principal/courses', pathMatch: 'full' },
  { path: 'courses/grades', redirectTo: 'principal/courses/grades', pathMatch: 'full' },
  { path: 'courses/performance', redirectTo: 'principal/courses/performance', pathMatch: 'full' },
  { path: 'courses/exams', redirectTo: 'principal/courses/exams', pathMatch: 'full' },
  { path: 'courses/reports', redirectTo: 'principal/courses/reports', pathMatch: 'full' },
  { path: 'courses/risks', redirectTo: 'principal/courses/risks', pathMatch: 'full' },

  {
    path: '**',
    redirectTo: 'principal/courses'
  }
];