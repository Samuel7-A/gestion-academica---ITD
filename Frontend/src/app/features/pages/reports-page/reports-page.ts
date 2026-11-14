import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AcademicApiService, CourseSection, courseLabel, downloadCsv, makeCsv } from '../../../services/academic-api.service';
import { ApiSessionComponent } from '../../../shared/components/api-session/api-session';

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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly storageKey = 'apf3_reports_samuel_v1';
  sections: CourseSection[] = [];
  selectedGrade = 'todos';
  selectedSectionId = '';
  history: SavedReport[] = [];
  busy: ReportType | '' = '';
  loading = false;
  error = '';
  info = '';
  readonly label = courseLabel;

  ngOnInit(): void {
    this.history = this.readHistory();
    if (this.api.hasSession) void this.load();
  }

  get grades(): string[] { return [...new Set(this.sections.map(s => s.grade_level))]; }
  get filteredSections(): CourseSection[] {
    return this.sections.filter(s => this.selectedGrade === 'todos' || s.grade_level === this.selectedGrade);
  }
  get selectedSection(): CourseSection | undefined { return this.sections.find(s => s.id === this.selectedSectionId); }
  get visibleHistory(): SavedReport[] {
    return this.history.filter(h => !this.selectedSectionId || h.sectionId === this.selectedSectionId);
  }
  onGradeChange(): void {
    if (!this.filteredSections.some(s => s.id === this.selectedSectionId)) {
      this.selectedSectionId = this.filteredSections[0]?.id || '';
    }
  }
  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const result = await firstValueFrom(this.api.sections());
      this.sections = [...result].sort((a,b) => b.year - a.year || a.course_name.localeCompare(b.course_name));
      if (!this.sections.some(s => s.id === this.selectedSectionId)) this.selectedSectionId = this.sections[0]?.id || '';
      this.onGradeChange();
    } catch (e) { this.error = this.api.errorMessage(e); }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }

  async generate(type: ReportType): Promise<void> {
    const section = this.selectedSection;
    if (!section || this.busy) return;
    this.busy = type;
    this.error = '';
    this.info = '';
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
        // La asistencia está disponible en las variables de las predicciones;
        // el backend todavía no tiene un endpoint propio para reportes de asistencia.
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
          ...results.map(x => [x.code,x.name,x.attendance ?? 'Sin dato'])
        ];
        if (available.length < results.length) this.info = `${results.length-available.length} estudiantes no tienen datos de asistencia completos.`;
      }
      const csv = makeCsv(rows);
      const slug = section.id.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const filename = `reporte_${type.toLowerCase()}_${slug}_${new Date().toISOString().slice(0,10)}.csv`;
      const item: SavedReport = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        type, sectionId: section.id, course: courseLabel(section),
        generatedAt: new Date().toISOString(), filename, csv
      };
      this.history = [item, ...this.history].slice(0,25);
      try { localStorage.setItem(this.storageKey, JSON.stringify(this.history)); }
      catch { this.info = 'El CSV se descargó, pero no se pudo guardar el historial local del navegador.'; }
      downloadCsv(filename, csv);
    } catch (e) { this.error = this.api.errorMessage(e); }
    finally { this.busy = ''; this.cdr.markForCheck(); }
  }

  download(item: SavedReport): void { downloadCsv(item.filename,item.csv); }
  displayDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }
  private readHistory(): SavedReport[] {
    try {
      const json = localStorage.getItem(this.storageKey);
      const value: unknown = json ? JSON.parse(json) : [];
      return Array.isArray(value) ? value.filter((r): r is SavedReport =>
        r && typeof r === 'object' && typeof r.filename === 'string' && typeof r.csv === 'string') : [];
    } catch { return []; }
  }
}
