/** Modelo de compatibilidad para los formularios mock de Sebastián.
 * No equivale al modelo de autenticación de FastAPI.
 */
export interface Usuario {
  id: string;
  primerNombre: string;
  apellido_uno: string;
  apellido_dos: string;
  telefono: string;
  correo: string;
  password: string;
  activo: boolean;
}
