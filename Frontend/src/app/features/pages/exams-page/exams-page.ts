import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AcademicActivity, AcademicApiService, CourseSection, courseLabel } from '../../../services/academic-api.service';
import { ApiSessionComponent } from '../../../shared/components/api-session/api-session';

type ExamStatus = 'pendiente' | 'realizado' | 'cancelado';
interface ExamSchedule { date: string; time: string; room: string; status: ExamStatus; }
interface ExamRow { activity: AcademicActivity; section: CourseSection; schedule: ExamSchedule | null; }

@Component({
  selector: 'app-exams-page', standalone: true,
  imports: [CommonModule, FormsModule, ApiSessionComponent],
  templateUrl: './exams-page.html',
  styleUrls: ['../academic-pages.css', './exams-page.css']
})
export class ExamsPageComponent implements OnInit {
  readonly api = inject(AcademicApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly key = 'apf3_exam_schedules_v1';
  sections: CourseSection[] = [];
  exams: ExamRow[] = [];
  selectedCourse = 'todos';
  selectedStatus = 'todos';
  loading = false;
  saving = false;
  error = '';
  notice = '';
  showEditor = false;
  editActivityId = '';
  form = { sectionId:'', title:'', bimester:1, date:'', time:'08:30', room:'', status:'pendiente' as ExamStatus };
  private schedules: Record<string, ExamSchedule> = {};
  readonly label = courseLabel;

  ngOnInit(): void {
    try {
      const saved = localStorage.getItem(this.key);
      const parsed: unknown = saved ? JSON.parse(saved) : {};
      this.schedules = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string,ExamSchedule> : {};
    } catch { this.schedules = {}; }
    if (this.api.hasSession) void this.load();
  }

  get filteredExams(): ExamRow[] {
    return this.exams.filter(e =>
      (this.selectedCourse === 'todos' || e.section.id === this.selectedCourse) &&
      (this.selectedStatus === 'todos' || this.statusOf(e) === this.selectedStatus)
    );
  }
  get nextExam(): ExamRow | undefined {
    const now = Date.now();
    return this.exams.filter(e => e.schedule?.date && this.statusOf(e) === 'pendiente' &&
      new Date(`${e.schedule.date}T${e.schedule.time || '00:00'}`).getTime() >= now)
      .sort((a,b) => `${a.schedule?.date}T${a.schedule?.time}`.localeCompare(`${b.schedule?.date}T${b.schedule?.time}`))[0];
  }
  statusOf(e: ExamRow): ExamStatus | 'sin-fecha' {
    return e.schedule?.date ? e.schedule.status : 'sin-fecha';
  }
  statusName(e: ExamRow): string {
    const labels = { pendiente:'Pendiente', realizado:'Realizado', cancelado:'Cancelado', 'sin-fecha':'Sin fecha' };
    return labels[this.statusOf(e)];
  }
  formatDate(date: string): string {
    if (!date) return 'Sin programar';
    const [year,month,day] = date.split('-').map(Number);
    return new Date(year,month-1,day).toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'});
  }
  private isExam(activity: AcademicActivity): boolean {
    return /examen|evaluaci[oó]n|control|prueba|parcial|quiz/i.test(activity.title);
  }
  async load(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      const sections = await firstValueFrom(this.api.sections());
      this.sections = [...sections].sort((a,b) => b.year-a.year || a.course_name.localeCompare(b.course_name));
      const lists = await Promise.all(this.sections.map(async section => {
        try {
          const activities = await firstValueFrom(this.api.activities(section.id));
          return activities.filter(a => this.isExam(a)).map(activity => ({
            activity,section,schedule:this.schedules[activity.id] ?? null
          } as ExamRow));
        } catch { return [] as ExamRow[]; }
      }));
      this.exams = lists.flat().sort((a,b) => b.section.year-a.section.year || a.section.course_name.localeCompare(b.section.course_name));
      if (!this.form.sectionId) this.form.sectionId = this.sections[0]?.id || '';
    } catch (e) { this.error = this.api.errorMessage(e); }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }
  newExam(): void {
    this.editActivityId = '';
    this.form = { sectionId:this.selectedCourse !== 'todos' ? this.selectedCourse : this.sections[0]?.id || '', title:'', bimester:1, date:'', time:'08:30', room:'', status:'pendiente' };
    this.notice = ''; this.showEditor = true;
  }
  editExam(e: ExamRow): void {
    this.editActivityId = e.activity.id;
    this.form = {
      sectionId:e.section.id, title:e.activity.title, bimester:e.activity.bimester,
      date:e.schedule?.date || '', time:e.schedule?.time || '08:30',
      room:e.schedule?.room || '', status:e.schedule?.status || 'pendiente'
    };
    this.notice = ''; this.showEditor = true;
  }
  async save(): Promise<void> {
    if (this.saving) return;
    if (!this.form.sectionId || !this.form.title.trim() || !this.form.date || !/^\d{4}-\d{2}-\d{2}$/.test(this.form.date)) {
      this.error = 'Completa el curso, nombre y fecha del examen.'; return;
    }
    this.saving = true; this.error = '';
    try {
      let activityId = this.editActivityId;
      if (!activityId) {
        const newActivity = await firstValueFrom(this.api.createActivity(this.form.sectionId, this.form.title.trim(), this.form.bimester));
        activityId = newActivity.id;
      }
      this.schedules[activityId] = {
        date:this.form.date, time:this.form.time || '08:30', room:this.form.room.trim(), status:this.form.status
      };
      try { localStorage.setItem(this.key, JSON.stringify(this.schedules)); }
      catch { this.notice = 'Se creó la actividad, pero no se pudo guardar el horario en el navegador.'; }
      this.showEditor = false;
      if (!this.notice) this.notice = 'Examen guardado. El nombre y bimestre existen en FastAPI; el horario y estado se guardan en este navegador.';
      await this.load();
    } catch (e) { this.error = this.api.errorMessage(e); }
    finally { this.saving = false; this.cdr.markForCheck(); }
  }
}
