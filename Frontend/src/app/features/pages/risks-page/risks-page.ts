import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AcademicApiService, Prediction, courseLabel, makeCsv, downloadCsv } from '../../../services/academic-api.service';
import { CourseSection } from '../../../models/courseSection';
import { UsuarioService } from '../../../services/usuario.service';


interface RiskRow {
  id: string;
  name: string;
  code: string;
  attendance: number | null;
  average: number | null;
  homework: number | null;
  projected: number | null;
  risk: 'bajo' | 'moderado' | 'alto' | 'sin-dato';
  modelVersion: string;
}

@Component({
  selector: 'app-risks-page', standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './risks-page.html',
  styleUrls: ['../academic-pages.css', './risks-page.css']
})

export class RisksPageComponent implements OnInit {
  private readonly api = inject(AcademicApiService);
  readonly userService = inject(UsuarioService);

  // --- Signals de Estado ---
  public readonly sections = signal<CourseSection[]>([]);
  public readonly selectedSectionId = signal<string>('');
  public readonly selectedRisk = signal<string>('todos');
  public readonly rows = signal<RiskRow[]>([]);
  
  public readonly loadingSections = signal<boolean>(false);
  public readonly loadingRows = signal<boolean>(false);
  public readonly error = signal<string>('');

  public readonly label = courseLabel;

  // --- Computed Signals (Derivados) ---
  public readonly selectedSection = computed(() => 
    this.sections().find(s => s.id === this.selectedSectionId())
  );

  public readonly visibleRows = computed(() => {
    const risk = this.selectedRisk();
    const allRows = this.rows();
    return risk === 'todos' ? allRows : allRows.filter(r => r.risk === risk);
  });

  public readonly meanAttendance = computed(() => {
    const available = this.visibleRows()
      .map(s => s.attendance)
      .filter((v): v is number => v !== null);
    return available.length ? available.reduce((a, b) => a + b, 0) / available.length : null;
  });

  public readonly meanGrade = computed(() => {
    const available = this.visibleRows()
      .map(s => s.average)
      .filter((v): v is number => v !== null);
    return available.length ? available.reduce((a, b) => a + b, 0) / available.length : null;
  });

  public readonly countHigh = computed(() => 
    this.visibleRows().filter(x => x.risk === 'alto').length
  );

  public readonly countModel = computed(() => 
    this.visibleRows().filter(x => x.risk !== 'sin-dato').length
  );

  // --- Ciclo de Vida ---
  ngOnInit(): void {
    // Validación robusta de sesión utilizando el servicio y respaldo en auth_token
    const sessionActive = this.userService.hasSession || !!localStorage.getItem('auth_token');

    if (sessionActive) {
      void this.loadSections();
    } else {
      this.error.set('No hay una sesión activa. Inicia sesión para ver los indicadores de riesgo.');
    }
  }

  // --- Métodos de Acción / Carga ---
  async loadSections(): Promise<void> {
    this.loadingSections.set(true);
    this.error.set('');
    
    try {
      const fetchedSections = await firstValueFrom(this.api.sections());
      const sortedSections = [...fetchedSections].sort((a, b) => 
        b.year - a.year || a.course_name.localeCompare(b.course_name)
      );
      
      this.sections.set(sortedSections);

      if (!sortedSections.some(s => s.id === this.selectedSectionId())) {
        this.selectedSectionId.set(sortedSections[0]?.id || '');
      }

      if (this.selectedSectionId()) {
        await this.loadRows();
      }
    } catch (e) {
      this.error.set(this.api.errorMessage(e));
    } finally {
      this.loadingSections.set(false);
    }
  }

  async loadRows(): Promise<void> {
    const sectionId = this.selectedSectionId();
    if (!sectionId) {
      this.rows.set([]);
      return;
    }

    this.loadingRows.set(true);
    this.error.set('');
    this.rows.set([]);

    try {
      const gradebook = await firstValueFrom(this.api.gradebook(sectionId));
      
      const predictions = await Promise.all(
        gradebook.students.map(async row => {
          try {
            return await firstValueFrom(this.api.predict(row.student_id, sectionId));
          } catch {
            return null;
          }
        })
      );

      const mappedRows: RiskRow[] = gradebook.students.map((s, i) => {
        const p: Prediction | null = predictions[i];
        return {
          id: s.student_id,
          code: s.code,
          name: s.full_name,
          attendance: p?.features.attendance_pct ?? null,
          homework: p?.features.homework_pct ?? null,
          average: s.current_average,
          projected: p?.predicted_final_grade ?? null,
          risk: (p?.risk_level ?? 'sin-dato') as RiskRow['risk'],
          modelVersion: p?.model_version ?? ''
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      this.rows.set(mappedRows);

      if (predictions.every(x => x === null) && gradebook.students.length) {
        this.error.set('No se pudieron obtener las predicciones de ML. Revisa los indicadores del curso y FastAPI.');
      }
    } catch (e) {
      this.error.set(this.api.errorMessage(e));
    } finally {
      this.loadingRows.set(false);
    }
  }

  // --- Formateadores de UI ---
  compliance(value: number | null): string {
    if (value === null) return 'Sin dato';
    if (value >= 80) return 'Alto';
    if (value >= 60) return 'Medio';
    return 'Bajo';
  }

  percent(value: number | null): string {
    return value === null ? '—' : `${value.toFixed(1)}%`;
  }

  grade(value: number | null): string {
    return value === null ? '—' : value.toFixed(1);
  }

  riskLabel(value: RiskRow['risk']): string {
    return ({ bajo: 'Bajo', moderado: 'Medio', alto: 'Alto', 'sin-dato': 'Sin dato' })[value];
  }

  onSectionChange(newSectionId: string): void {
    this.selectedSectionId.set(newSectionId);
    void this.loadRows();
  }

  onRiskFilterChange(newRisk: string): void {
    this.selectedRisk.set(newRisk);
  }

  export(): void {
    const currentSection = this.selectedSection();
    const currentVisibleRows = this.visibleRows();

    if (!currentSection || !currentVisibleRows.length) return;

    const body = makeCsv([
      ['Indicadores de riesgo académico — datos sintéticos de demostración'],
      [courseLabel(currentSection)],
      [],
      ['Código', 'Estudiante', 'Asistencia (%)', 'Promedio actual', 'Cumplimiento tareas (%)', 'Proyección final', 'Riesgo', 'Modelo'],
      ...currentVisibleRows.map(r => [
        r.code, 
        r.name, 
        r.attendance, 
        r.average, 
        r.homework, 
        r.projected, 
        this.riskLabel(r.risk), 
        r.modelVersion
      ])
    ]);

    downloadCsv(`indicadores_riesgo_${currentSection.id.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`, body);
  }
}