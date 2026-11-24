/** @vitest-environment jsdom */
import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('Rutas principales del sistema', () => {
  it('mantiene accesibles las pantallas de autenticación', () => {
    expect(routes.some(r => r.path === 'auth/login')).toBe(true);
    expect(routes.some(r => r.path === 'auth/register')).toBe(true);
  });

  it('mantiene protegida la navegación académica', () => {
    const shell = routes.find(r => r.path === 'principal');
    expect(shell).toBeDefined();
    expect(shell?.canActivate?.length).toBeGreaterThan(0);
    expect(shell?.children?.some(r => r.path === 'courses')).toBe(true);
    expect(shell?.children?.some(r => r.path === 'courses/schedule')).toBe(true);
  });

  it('redirige las rutas desconocidas', () => {
    expect(routes.find(r => r.path === '**')?.redirectTo).toBe('principal/courses');
  });
});
