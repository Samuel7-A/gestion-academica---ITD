import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AcademicApiService, courseLabel } from '../../../services/academic-api.service';
import { Activity } from '../../../models/activity';
import { CourseSection } from '../../../models/courseSection';
import { UsuarioService } from '../../../services/usuario.service';

type ExamStatus = 'pendiente' | 'realizado' | 'cancelado';
interface ExamSchedule { date: string; time: string; room: string; status: ExamStatus; }
interface ExamRow { activity: Activity; section: CourseSection; schedule: ExamSchedule | null; }

@Component({
  selector: 'app-exams-page', standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exams-page.html',
  styleUrls: ['../academic-pages.css', './exams-page.css']
})
export class ExamsPageComponent implements OnInit {
  readonly api = inject(AcademicApiService);
  readonly userService = inject(UsuarioService);

  // --- Signals de Estado ---
  public readonly sections = signal<CourseSection[]>([]);
  public readonly exams = signal<ExamRow[]>([]);
  public readonly schedules = signal<Record<string, ExamSchedule>>({});
  
  public readonly selectedCourse = signal<string>('todos');
  public readonly selectedStatus = signal<string>('todos');
  
  public readonly loading = signal<boolean>(false);
  public readonly saving = signal<boolean>(false);
  public readonly error = signal<string>('');
  public readonly notice = signal<string>('');
  
  public readonly showEditor = signal<boolean>(false);
  public readonly editActivityId = signal<string>('');
  
  public readonly form = signal({
    sectionId: '',
    title: '',
    bimester: 1,
    date: '',
    time: '08:30',
    room: '',
    status: 'pendiente' as ExamStatus
  });

  // --- Computed Signals (Derivados) ---
  public readonly filteredExams = computed(() => {
    const course = this.selectedCourse();
    const status = this.selectedStatus();
    return this.exams().filter(e =>
      (course === 'todos' || e.section.id === course) &&
      (status === 'todos' || this.statusOf(e) === status)
    );
  });

  public readonly nextExam = computed(() => {
    const now = Date.now();
    return this.exams().filter(e => 
      e.schedule?.date && 
      this.statusOf(e) === 'pendiente' &&
      new Date(`${e.schedule.date}T${e.schedule.time || '00:00'}`).getTime() >= now
    ).sort((a, b) => 
      `${a.schedule?.date}T${a.schedule?.time}`.localeCompare(`${b.schedule?.date}T${b.schedule?.time}`)
    )[0];
  });

  /**
   * Obtiene de forma robusta el ID del usuario actual para aislar el localStorage
   * utilizando la llave 'current_user' establecida por tu UsuarioService.
   */
  private getUserId(): string {
    const userFromService = this.userService.currentUser();
    if (userFromService?.id) {
      return userFromService.id;
    }

    try {
      const stored = localStorage.getItem('current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) return parsed.id;
      }
    } catch (e) {
      console.warn('Error leyendo current_user de localStorage', e);
    }

    return 'guest';
  }

  // Llave de almacenamiento local aislada por usuario
  private get storageKey(): string {
    return `apf3_schedules_${this.getUserId()}_v1`;
  }

  ngOnInit(): void {
    // 1. Cargar el almacenamiento local correspondiente al usuario
    try {
      const saved = localStorage.getItem(this.storageKey);
      const parsed: unknown = saved ? JSON.parse(saved) : {};
      
      const loadedSchedules = parsed && typeof parsed === 'object' && !Array.isArray(parsed) 
        ? (parsed as Record<string, ExamSchedule>) 
        : {};

      this.schedules.set(loadedSchedules);
    } catch { 
      this.schedules.set({}); 
    }

    // 2. Validación robusta de sesión utilizando el getter del servicio y respaldo en auth_token
    const sessionActive = this.userService.hasSession || !!localStorage.getItem('auth_token');

    if (sessionActive) {
      void this.load();
    } else {
      this.error.set('No hay una sesión activa. Inicia sesión para ver y programar exámenes.');
    }
  }

  statusOf(e: ExamRow): ExamStatus | 'sin-fecha' {
    return e.schedule?.date ? e.schedule.status : 'sin-fecha';
  }

  statusName(e: ExamRow): string {
    const labels = { pendiente: 'Pendiente', realizado: 'Realizado', cancelado: 'Cancelado', 'sin-fecha': 'Sin fecha' };
    return labels[this.statusOf(e)];
  }

  formatDate(date: string): string {
    if (!date) return 'Sin programar';
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private isExam(activity: Activity): boolean {
    return /examen|evaluaci[oó]n|control|prueba|parcial|quiz/i.test(activity.title);
  }

  async load(): Promise<void> {
    this.loading.set(true); 
    this.error.set('');
    try {
      const sections = await firstValueFrom(this.api.sections());
      const sortedSections = [...sections].sort((a, b) => b.year - a.year || a.course_name.localeCompare(b.course_name));
      this.sections.set(sortedSections);

      const currentSchedules = this.schedules();

      const lists = await Promise.all(sortedSections.map(async section => {
        try {
          const activities = await firstValueFrom(this.api.activities(section.id));
          return activities.filter(a => this.isExam(a)).map(activity => ({
            activity,
            section,
            schedule: currentSchedules[activity.id] ?? null
          } as ExamRow));
        } catch { return [] as ExamRow[]; }
      }));

      const flattenedExams = lists.flat().sort((a, b) => 
        b.section.year - a.section.year || a.section.course_name.localeCompare(b.section.course_name)
      );
      
      this.exams.set(flattenedExams);

      if (!this.form().sectionId) {
        this.form.update(f => ({ ...f, sectionId: sortedSections[0]?.id || '' }));
      }
    } catch (e) { 
      this.error.set(this.api.errorMessage(e)); 
    } finally { 
      this.loading.set(false); 
    }
  }

  newExam(): void {
    this.editActivityId.set('');
    const defaultSection = this.selectedCourse() !== 'todos' ? this.selectedCourse() : this.sections()[0]?.id || '';
    this.form.set({
      sectionId: defaultSection,
      title: '',
      bimester: 1,
      date: '',
      time: '08:30',
      room: '',
      status: 'pendiente'
    });
    this.notice.set(''); 
    this.showEditor.set(true);
  }

  editExam(e: ExamRow): void {
    this.editActivityId.set(e.activity.id);
    this.form.set({
      sectionId: e.section.id,
      title: e.activity.title,
      bimester: e.activity.bimester,
      date: e.schedule?.date || '',
      time: e.schedule?.time || '08:30',
      room: e.schedule?.room || '',
      status: e.schedule?.status || 'pendiente'
    });
    this.notice.set(''); 
    this.showEditor.set(true);
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    const currentForm = this.form();

    if (!currentForm.sectionId || !currentForm.title.trim() || !currentForm.date || !/^\d{4}-\d{2}-\d{2}$/.test(currentForm.date)) {
      this.error.set('Completa el curso, nombre y fecha del examen.'); 
      return;
    }
    
    this.saving.set(true); 
    this.error.set('');
    
    try {
      let activityId = this.editActivityId();
      if (!activityId) {
        const newActivity = await firstValueFrom(this.api.createActivity(currentForm.sectionId, currentForm.title.trim(), currentForm.bimester));
        activityId = newActivity.id;
      }

      const updatedSchedules = {
        ...this.schedules(),
        [activityId]: {
          date: currentForm.date,
          time: currentForm.time || '08:30',
          room: currentForm.room.trim(),
          status: currentForm.status
        }
      };

      this.schedules.set(updatedSchedules);

      try { 
        localStorage.setItem(this.storageKey, JSON.stringify(updatedSchedules)); 
      } catch { 
        this.notice.set('Se creó la actividad, pero no se pudo guardar el horario en el navegador.'); 
      }
      
      this.showEditor.set(false);
      
      if (!this.notice()) {
        this.notice.set('Examen guardado correctamente.');
      }
      
      await this.load();
    } catch (e) { 
      this.error.set(this.api.errorMessage(e)); 
    } finally { 
      this.saving.set(false); 
    }
  }
}