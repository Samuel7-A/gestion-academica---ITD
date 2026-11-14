import type { Especialidad } from './especialidad.model';
import type { Usuario } from './usuario.model';

/** Asociación temporal de docentes y especialidades para mock local. */
export interface DocenteEspecialidad {
  id: string;
  usuarioId: string;
  especialidadId: string;
  activo: boolean;
  usuario?: Usuario;
  especialidad?: Especialidad;
}
