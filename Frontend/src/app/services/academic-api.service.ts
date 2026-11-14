import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ACADEMIC_API_URL } from '../core/config/api.config';

// Contratos exactamente alineados con los esquemas de Backend/app/schemas.py.
export interface CourseSection {
  id: string;
  course_id: string;
  course_name: string;
  section_id: string;
  year: number;
  grade_level: string;
  section_name: string;
  teacher_id: string;
  student_count: number;
}
export interface Student {
  id: string;
  code: string;
  full_name: string;
}
export interface AcademicActivity {
  id: string;
  course_section_id: string;
  bimester: number;
  title: string;
}
export interface GradebookRow {
  student_id: string;
  code: string;
  full_name: string;
  grades: Array<{ activity_id: string; value: number; updated_at: string }>;
  bimester_averages: Record<'bimester_1' | 'bimester_2' | 'bimester_3' | 'bimester_4', number | null>;
  current_average: number | null;
}
export interface Gradebook {
  course_section: CourseSection;
  activities: AcademicActivity[];
  students: GradebookRow[];
}
export interface Prediction {
  student_id: string;
  course_section_id: string;
  predicted_final_grade: number;
  risk_level: 'bajo' | 'moderado' | 'alto';
  synthetic_data: boolean;
  model_version: string;
  features: {
    grade_bimester_1: number;
    grade_bimester_2: number;
    attendance_pct: number;
    homework_pct: number;
    participation_pct: number;
    previous_average: number;
  };
}
interface LoginResponse { access_token: string; token_type: string; expires_in: number; }

@Injectable({ providedIn: 'root' })
export class AcademicApiService {
  private readonly http = inject(HttpClient);
  private readonly tokenKey = 'apf3_teacher_access_token';
  private readonly api = ACADEMIC_API_URL;

  get hasSession(): boolean { return !!sessionStorage.getItem(this.tokenKey); }

  authenticate(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, { email, password }).pipe(
      tap((response: LoginResponse) => sessionStorage.setItem(this.tokenKey, response.access_token))
    );
  }

  logout(): void { sessionStorage.removeItem(this.tokenKey); }

  private options() {
    const token = sessionStorage.getItem(this.tokenKey) || '';
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  sections(): Observable<CourseSection[]> {
    return this.http.get<CourseSection[]>(`${this.api}/course-sections`, this.options());
  }
  activities(sectionId: string): Observable<AcademicActivity[]> {
    return this.http.get<AcademicActivity[]>(`${this.api}/course-sections/${encodeURIComponent(sectionId)}/activities`, this.options());
  }
  createActivity(sectionId: string, title: string, bimester: number): Observable<AcademicActivity> {
    return this.http.post<AcademicActivity>(`${this.api}/course-sections/${encodeURIComponent(sectionId)}/activities`, { title, bimester }, this.options());
  }
  gradebook(sectionId: string): Observable<Gradebook> {
    return this.http.get<Gradebook>(`${this.api}/course-sections/${encodeURIComponent(sectionId)}/gradebook`, this.options());
  }
  predict(studentId: string, sectionId: string): Observable<Prediction> {
    return this.http.post<Prediction>(`${this.api}/ml/predict`, {
      student_id: studentId, course_section_id: sectionId
    }, this.options());
  }

  errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No se pudo conectar con FastAPI. Comprueba Docker y http://localhost:8000/docs.';
      if (error.status === 401) return 'La sesión no es válida o expiró. Vuelve a conectarte con tu usuario docente.';
      if (error.status === 403) return 'El docente no tiene permisos para consultar este curso.';
      const detail = error.error?.detail;
      if (typeof detail === 'string') return detail;
      return `Error HTTP ${error.status}. Revisa el backend.`;
    }
    return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  }
}

// Exportación local real: descarga CSV compatible con Excel sin depender de un endpoint inexistente.
export function makeCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const clean = (value: string | number | null | undefined): string => {
    let text = String(value ?? '');
    // Evita que hojas de cálculo interpreten nombres de estudiantes como fórmulas.
    if (/^[\s]*[=+@\-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return rows.map(row => row.map(clean).join(';')).join('\r\n');
}
export function downloadCsv(filename: string, body: string): void {
  const blob = new Blob(['\ufeff', body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
export function courseLabel(section: CourseSection): string {
  return `${section.course_name} · ${section.grade_level} ${section.section_name} (${section.year})`;
}
