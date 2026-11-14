import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Obtenemos el token que guardaste en el localStorage al iniciar sesión
  const token = localStorage.getItem('auth_token');

  // Si el token existe, clonamos la petición y le añadimos el encabezado Authorization
  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedReq);
  }

  // Si no hay token, la petición se envía tal cual (útil para login o registro)
  return next(req);
};