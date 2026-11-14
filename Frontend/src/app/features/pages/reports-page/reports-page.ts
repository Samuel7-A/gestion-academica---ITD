import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AcademicApiService, courseLabel, downloadCsv, makeCsv } from '../../../services/academic-api.service';
import { CourseSection } from '../../../models/courseSection';
import { ApiSessionComponent } from '../../../shared/components/api-session/api-session';
import { UsuarioService } from '../../../services/usuario.service';

type ReportType = 'Notas' | 'Asistencia';
interface SavedReport {
  id: string;
  type: ReportType;
  sectionId: string;
  course: string;
  generatedAt: string;
  filename: string;
  csv: string;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ApiSessionComponent],
  templateUrl: './reports-page.html',
  styleUrls: ['../academic-pages.css', './reports-page.css']
})
export class ReportsPageComponent implements OnInit {
  readonly api = inject(AcademicApiService);
  readonly userService = inject(UsuarioService);

  // --- Signals de Estado ---
  public readonly sections = signal<CourseSection[]>([]);
  public readonly selectedGrade = signal<string>('todos');
  public readonly selectedSectionId = signal<string>('');
  public readonly history = signal<SavedReport[]>([]);
  public readonly busy = signal<ReportType | ''>('');
  
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string>('');
  public readonly info = signal<string>('');

  public readonly label = courseLabel;

  /**
   * Obtiene de forma robusta el ID del usuario actual para aislar el localStorage
   * utilizando la llave 'current_user' o el signal del servicio.
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

  // --- Computed Storage Key ---
  private get storageKey(): string {
    return `apf3_reports_${this.getUserId()}_v1`;
  }

  // --- Computed Signals (Derivados) ---
  public readonly grades = computed(() => 
    [...new Set(this.sections().map(s => s.grade_level))]
  );

  public readonly filteredSections = computed(() => {
    const grade = this.selectedGrade();
    const allSections = this.sections();
    return grade === 'todos' ? allSections : allSections.filter(s => s.grade_level === grade);
  });

  public readonly selectedSection = computed(() => 
    this.sections().find(s => s.id === this.selectedSectionId())
  );

  public readonly visibleHistory = computed(() => {
    const secId = this.selectedSectionId();
    const allHistory = this.history();
    return secId ? allHistory.filter(h => h.sectionId === secId) : allHistory;
  });

  ngOnInit(): void {
    // Validación de sesión usando tanto el getter del servicio como respaldo directo en auth_token
    const sessionActive = this.userService.hasSession || !!localStorage.getItem('auth_token');

    if (!sessionActive) {
      this.error.set('No hay una sesión activa. Inicia sesión para ver y generar reportes.');
      this.history.set([]);
      return;
    }

    this.history.set(this.readHistory());
    void this.load();
  }

  onGradeChange(newGrade: string): void {
    this.selectedGrade.set(newGrade);
    const filtered = this.filteredSections();
    if (!filtered.some(s => s.id === this.selectedSectionId())) {
      this.selectedSectionId.set(filtered[0]?.id || '');
    }
  }

  onSectionChange(newSectionId: string): void {
    this.selectedSectionId.set(newSectionId);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await firstValueFrom(this.api.sections());
      const sortedSections = [...result].sort((a, b) => b.year - a.year || a.course_name.localeCompare(b.course_name));
      this.sections.set(sortedSections);
      
      if (!sortedSections.some(s => s.id === this.selectedSectionId())) {
        this.selectedSectionId.set(sortedSections[0]?.id || '');
      }
      this.onGradeChange(this.selectedGrade());
    } catch (e) { 
      this.error.set(this.api.errorMessage(e)); 
    } finally { 
      this.loading.set(false); 
    }
  }

  async generate(type: ReportType): Promise<void> {
    const section = this.selectedSection();
    if (!section || this.busy()) return;
    this.busy.set(type);
    this.error.set('');
    this.info.set('');
    try {
      const gradebook = await firstValueFrom(this.api.gradebook(section.id));
      let rows: Array<Array<string | number | null | undefined>>;
      
      if (type === 'Notas') {
        rows = [
          ['Reporte de notas', courseLabel(section)],
          ['Datos académicos de demostración; no constituyen actas oficiales'],
          [],
          ['Código', 'Estudiante', 'Bimestre 1', 'Bimestre 2', 'Bimestre 3', 'Bimestre 4', 'Promedio actual'],
          ...gradebook.students.map(s => [s.code, s.full_name,
            s.bimester_averages.bimester_1, s.bimester_averages.bimester_2,
            s.bimester_averages.bimester_3, s.bimester_averages.bimester_4,
            s.current_average])
        ];
      } else {
        const results = await Promise.all(gradebook.students.map(async s => {
          try {
            const result = await firstValueFrom(this.api.predict(s.student_id, section.id));
            return { code: s.code, name: s.full_name, attendance: result.features.attendance_pct };
          } catch { return { code: s.code, name: s.full_name, attendance: null }; }
        }));
        const available = results.filter(x => x.attendance !== null);
        if (!available.length) throw new Error('No hay indicadores de asistencia disponibles para este curso.');
        
        rows = [
          ['Reporte de asistencia', courseLabel(section)],
          ['Indicadores sintéticos almacenados en el backend; no es control de asistencia diario'],
          [], ['Código','Estudiante','Asistencia (%)'],
          ...results.map(x => [x.code, x.name, x.attendance ?? 'Sin dato'])
        ];
        
        if (available.length < results.length) {
          this.info.set(`${results.length - available.length} estudiantes no tienen datos de asistencia completos.`);
        }
      }

      const csv = makeCsv(rows);
      const slug = section.id.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const filename = `reporte_${type.toLowerCase()}_${slug}_${new Date().toISOString().slice(0,10)}.csv`;
      
      const item: SavedReport = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        type, 
        sectionId: section.id, 
        course: courseLabel(section),
        generatedAt: new Date().toISOString(), 
        filename, 
        csv
      };

      const updatedHistory = [item, ...this.history()].slice(0, 25);
      this.history.set(updatedHistory);

      try { 
        localStorage.setItem(this.storageKey, JSON.stringify(updatedHistory)); 
      } catch { 
        this.info.set('El CSV se descargó, pero no se pudo guardar el historial local del navegador.'); 
      }
      
      downloadCsv(filename, csv);
    } catch (e) { 
      this.error.set(this.api.errorMessage(e)); 
    } finally { 
      this.busy.set(''); 
    }
  }

  download(item: SavedReport): void { 
    downloadCsv(item.filename, item.csv); 
  }

  displayDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  private readHistory(): SavedReport[] {
    try {
      const json = localStorage.getItem(this.storageKey);
      const value: unknown = json ? JSON.parse(json) : [];
      return Array.isArray(value)
        ? value.filter((r): r is SavedReport =>
            r && typeof r === 'object' && typeof r.filename === 'string' && typeof r.csv === 'string'
          )
        : [];
    } catch {
      return [];
    }
  }
}