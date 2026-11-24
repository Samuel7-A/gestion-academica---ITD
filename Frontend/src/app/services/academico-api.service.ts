import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ACADEMIC_API_URL } from '../core/config/api.config'; // Ajusta tu ruta de config
import { CourseSection } from '../models/courseSection';
import { Activity } from '../models/activity';

@Injectable({
  providedIn: 'root'
})
export class AcademicoService {
  private readonly http = inject(HttpClient);
  private readonly api = ACADEMIC_API_URL; 
  private readonly apiCourse = ACADEMIC_API_URL + '/course-sections';
  // 1. GET: Cursos y secciones del docente
  getCourseSections(): Observable<any[]> {
    return this.http.get<CourseSection[]>(`${this.apiCourse}`);
  }

  // 2. GET: Estudiantes matriculados por sección
  getStudentsBySection(courseSectionId: number | string): Observable<any[]> {
    return this.http.get<Activity[]>(`${this.apiCourse}/${courseSectionId}/students`);
  }

  // 3. GET: Actividades de una sección
  getActivitiesBySection(courseSectionId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiCourse}/${courseSectionId}/activities`);
  }

  // 4. POST: Registrar una actividad en una sección
  createActivity(courseSectionId: number | string, activityData: any): Observable<any> {
    return this.http.post<any>(`${this.apiCourse}/${courseSectionId}/activities`, activityData);
  }

  // 5. GET: Registro de notas (gradebook) por sección
  getGradebook(courseSectionId: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiCourse}/${courseSectionId}/gradebook`);
  }

  // Guardado real de notas mediante FastAPI (valida 0-20 en servidor).
  saveGrade(activityId: string, studentId: string, value: number): Observable<any> {
    return this.http.put<any>(`${this.api}/activities/${encodeURIComponent(activityId)}/grades/${encodeURIComponent(studentId)}`, { value });
  }

  // Vaciar una celda elimina la nota, no equivale a guardar cero.
  deleteGrade(activityId: string, studentId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/activities/${encodeURIComponent(activityId)}/grades/${encodeURIComponent(studentId)}`);
  }

  // 6. GET: Historial académico de un estudiante (todos los años)
  getStudentAcademicHistory(studentId: number | string): Observable<any> {
    return this.http.get<any>(`${this.api}/api/v1/students/${studentId}/academic-history`);
  }
}
