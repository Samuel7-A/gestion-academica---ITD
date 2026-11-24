import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Activity } from '../../../models/activity';
import { GradebookResponse, StudentGradebook } from '../../../models/Gradebook';
import { AcademicoService } from '../../../services/academico-api.service';
import { downloadCsv, makeCsv } from '../../../services/academic-api.service';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button';
import { parseGradeInput } from './grade-save-validator';

@Component({
  selector: 'app-grades-page',
  standalone: true,
  imports: [CommonModule, CustomButtonComponent],
  templateUrl: './grades-pages.html',
  styleUrls: ['./grades-pages.css']
})
export class GradesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly academic = inject(AcademicoService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly courseSectionId = signal<string | null>(null);
  readonly activities = signal<Activity[]>([]);
  readonly studentsList = signal<StudentGradebook[]>([]);
  readonly courseInfo = signal<GradebookResponse['course_section'] | null>(null);
  readonly generalClassAverage = signal<string>('—');

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.courseSectionId.set(id);
        void this.cargarGradebook(id);
      } else {
        this.error.set('Selecciona un curso para registrar calificaciones.');
        this.isLoading.set(false);
      }
    });
  }

  private applyGradebook(data: GradebookResponse): void {
    const students = Array.isArray(data.students) ? data.students : [];
    this.courseInfo.set(data.course_section ?? null);
    this.activities.set(Array.isArray(data.activities) ? data.activities : []);
    this.studentsList.set(students);
    const averages = students
      .map(s => s.current_average)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    this.generalClassAverage.set(
      averages.length ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(2) : '—'
    );
  }

  async cargarGradebook(sectionId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set('');
    try {
      this.applyGradebook(await firstValueFrom(this.academic.getGradebook(sectionId)));
    } catch {
      this.error.set('No fue posible consultar las calificaciones en FastAPI. Comprueba la sesión y el backend.');
      this.studentsList.set([]);
      this.activities.set([]);
      this.generalClassAverage.set('—');
    } finally {
      this.isLoading.set(false);
    }
  }

  getGradeForActivity(student: StudentGradebook, activityId: string): number | null {
    const grade = student.grades?.find(g => g.activity_id === activityId);
    return grade && typeof grade.value === 'number' ? grade.value : null;
  }

  gradeInputValue(student: StudentGradebook, activityId: string): string {
    const grade = this.getGradeForActivity(student, activityId);
    return grade === null ? '' : String(grade);
  }

  /** Guarda cuando el campo pierde el foco; la respuesta de FastAPI se vuelve a consultar. */
  async guardarNota(studentId: string, activityId: string, event: FocusEvent): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    if (!input || this.isSaving()) return;
    const student = this.studentsList().find(s => s.student_id === studentId);
    const sectionId = this.courseSectionId();
    if (!student || !sectionId) return;

    const previous = this.getGradeForActivity(student, activityId);
    const parsed = parseGradeInput(input.value);
    if (parsed.kind === 'invalid') {
      this.error.set('La nota debe estar entre 0 y 20 y tener como máximo dos decimales.');
      this.notice.set('');
      input.value = previous === null ? '' : String(previous);
      return;
    }
    if (parsed.kind === 'empty' && previous === null) return;
    if (parsed.kind === 'value' && previous === parsed.value) return;

    this.isSaving.set(true);
    this.error.set('');
    this.notice.set('Guardando en PostgreSQL…');
    try {
      if (parsed.kind === 'empty') {
        await firstValueFrom(this.academic.deleteGrade(activityId, studentId));
      } else {
        await firstValueFrom(this.academic.saveGrade(activityId, studentId, parsed.value));
      }
      this.applyGradebook(await firstValueFrom(this.academic.getGradebook(sectionId)));
      this.notice.set('Guardado correctamente. Puedes recargar la página para comprobarlo.');
    } catch {
      this.notice.set('');
      this.error.set('No se pudo confirmar el guardado. Comprueba FastAPI y vuelve a intentarlo.');
      // Conserva el texto editado por el docente para permitir el reintento.
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    void this.router.navigate(['/principal/courses']);
  }

  onExport(): void {
    const section = this.courseSectionId();
    if (!section) return;
    const acts = this.activities();
    const rows: Array<Array<string | number | null | undefined>> = [
      ['Registro de calificaciones — datos sintéticos de demostración'],
      ['Código', 'Estudiante', ...acts.map(a => `${a.title} (B${a.bimester})`), 'Promedio actual'],
      ...this.studentsList().map(student => [
        student.code, student.full_name,
        ...acts.map(a => this.getGradeForActivity(student, a.id)),
        student.current_average
      ])
    ];
    downloadCsv(`calificaciones_${section}.csv`, makeCsv(rows));
  }
}
