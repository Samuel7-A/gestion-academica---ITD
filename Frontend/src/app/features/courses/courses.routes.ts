import { Routes } from '@angular/router';

export const COURSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/course-page/courses-page').then(m => m.CoursesPageComponent)
  },
];