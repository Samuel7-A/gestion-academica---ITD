import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';
import { authGuard } from './core/guard/auth.guard';

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
    path: 'principal',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: 'courses',
        loadComponent: () => import('./features/pages/course-page/courses-page').then(m => m.CoursesPageComponent)
      },
      {
        path: 'courses/grades/:id',
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
        path: 'courses/schedule',
        loadComponent: () => import('./features/pages/schedule-page/schedule-page').then(m => m.SchedulePageComponent)
      },
      {
        path: 'courses/grades',
        redirectTo: 'courses',
        pathMatch: 'full'
      },
      {
        path: 'courses/admin',
        loadComponent: () => import('./features/pages/admin-page/admin-page').then(m => m.AdminPageComponent)
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
    redirectTo: 'principal/courses'
  }
];