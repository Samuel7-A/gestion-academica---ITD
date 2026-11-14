import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const router = inject(Router);
  const token = localStorage.getItem('auth_token');

  // Si el token existe, permitimos el paso
  if (token && token.trim() !== '') {
    return true;
  }

  // Si no hay token, devolvemos el UrlTree directamente al login.
  // Esto le dice a Angular de forma segura hacia dónde redirigir sin romper el ciclo de rutas.
  return router.createUrlTree(['/auth/login']);
};