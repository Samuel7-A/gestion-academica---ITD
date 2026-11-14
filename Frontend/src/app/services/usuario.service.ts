import { inject, Injectable } from "@angular/core";
import { docenteEspecialidadMock } from "../data/mock-docente-especialidad";
import { especialidadesMock } from "../data/mock-especialidad";
import { usuariosMock } from "../data/mock-usuario";
import { DocenteEspecialidad } from "../models/docente-especialidad.model";
import { Especialidad } from "../models/especialidad.model";
import { Usuario } from "../models/usuario.model";
import { Observable, of } from "rxjs";


@Injectable({
  providedIn: 'root'
})

export class UsuarioService {
  private usuariosDB: Usuario[] = [...usuariosMock];
  private asignacionesDB: DocenteEspecialidad[] = [...docenteEspecialidadMock];

  // Obtener catálogo predefinido para el <select>
  getCatalogoEspecialidades(): Observable<Especialidad[]> {
    const activas = especialidadesMock.filter(e => e.activo);
    return of(activas);
  }

  // Obtener lista de docentes
  getAll(): Observable<Usuario[]> {
    return of([...this.usuariosDB]);
  }

  // Obtener las especialidades asignadas a un docente (simula JOIN)
  getEspecialidadesPorDocente(usuarioId: string): Observable<DocenteEspecialidad[]> {
    const asignaciones = this.asignacionesDB.filter(a => a.usuarioId === usuarioId && a.activo);
    
    const pobladas = asignaciones.map(asignacion => ({
      ...asignacion,
      especialidad: especialidadesMock.find(e => e.id === asignacion.especialidadId)
    }));

    return of(pobladas);
  }

  // Guardar nueva especialidad en la tabla intermedia
  asignarEspecialidad(
    datos: Omit<DocenteEspecialidad, 'id' | 'usuario' | 'especialidad'>
  ): Observable<DocenteEspecialidad> {
    const nuevaAsignacion: DocenteEspecialidad = {
      ...datos,
      id: `de-${Date.now()}`
    };
    this.asignacionesDB.push(nuevaAsignacion);
    return of(nuevaAsignacion);
  }

   getById(id: string): Observable<Usuario | undefined> {
    // TODO: Reemplazar con: return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
    const docente = this.usuariosDB.find(u => u.id === id);
    return of(docente);
  }

  // Buscar un docente por su correo electrónico
  getByCorreo(correo: string): Observable<Usuario | undefined> {
    // TODO: Reemplazar con: return this.http.get<Usuario>(`${this.apiUrl}/buscar?correo=${correo}`);
    const correoNormalizado = correo.trim().toLowerCase();
    const docente = this.usuariosDB.find(
      u => u.correo.trim().toLowerCase() === correoNormalizado
    );
    return of(docente);
  }

  // Crear un nuevo docente
  newUsuario(datos: Omit<Usuario, 'id' | 'activo'>): Observable<Usuario> {
  // TODO: Cuando conectes el backend, reemplaza esto por:
  // return this.http.post<Usuario>(this.apiUrl, datos);

  const nuevoDocente: Usuario = {
    ...datos,
    id: `usr-${Date.now()}`,
    activo: true
  };

  this.usuariosDB.push(nuevoDocente);
  return of(nuevoDocente);
}


}
