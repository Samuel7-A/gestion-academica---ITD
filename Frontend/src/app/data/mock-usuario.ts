import type { Usuario } from '../models/usuario.model';

/** Lista local inicialmente vacía: el registro actual agrega usuarios en memoria.
 * IMPORTANTE: este login mock NO valida credenciales contra FastAPI.
 * No agregar aquí contraseñas reales ni claves de Supabase.
 */
export const usuariosMock: Usuario[] = [];
