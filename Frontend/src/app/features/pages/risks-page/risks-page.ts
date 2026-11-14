import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AcademicApiService, CourseSection, Prediction, courseLabel, makeCsv, downloadCsv } from '../../../services/academic-api.service';
import { ApiSessionComponent } from '../../../shared/components/api-session/api-session';

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
  imports: [CommonModule, FormsModule, ApiSessionComponent],
  templateUrl: './risks-page.html',
  styleUrls: ['../academic-pages.css', './risks-page.css']
})
export class RisksPageComponent implements OnInit {
  readonly api = inject(AcademicApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  sections: CourseSection[] = [];
  selectedSectionId = '';
  selectedRisk = 'todos';
  loadingSections = false;
  loadingRows = false;
  error = '';
  rows: RiskRow[] = [];
  readonly label = courseLabel;

  ngOnInit(): void { if (this.api.hasSession) void this.loadSections(); }
  get selectedSection(): CourseSection | undefined { return this.sections.find(s => s.id === this.selectedSectionId); }
  get visibleRows(): RiskRow[] { return this.rows.filter(r => this.selectedRisk === 'todos' || r.risk === this.selectedRisk); }
  get meanAttendance(): number | null {
    const available = this.visibleRows.map(s=>s.attendance).filter((v): v is number => v !== null);
    return available.length ? available.reduce((a,b)=>a+b,0)/available.length : null;
  }
  get meanGrade(): number | null {
    const available = this.visibleRows.map(s=>s.average).filter((v): v is number => v !== null);
    return available.length ? available.reduce((a,b)=>a+b,0)/available.length : null;
  }
  get countHigh(): number { return this.visibleRows.filter(x=>x.risk==='alto').length; }
  get countModel(): number { return this.visibleRows.filter(x=>x.risk!=='sin-dato').length; }
  compliance(value: number | null): string {
    if (value === null) return 'Sin dato';
    if (value >= 80) return 'Alto';
    if (value >= 60) return 'Medio';
    return 'Bajo';
  }
  percent(value: number | null): string { return value === null ? '—' : `${value.toFixed(1)}%`; }
  grade(value: number | null): string { return value === null ? '—' : value.toFixed(1); }
  riskLabel(value: RiskRow['risk']): string {
    return ({ bajo:'Bajo', moderado:'Medio', alto:'Alto', 'sin-dato':'Sin dato' })[value];
  }
  async loadSections(): Promise<void> {
    this.loadingSections = true; this.error = '';
    try {
      const sections = await firstValueFrom(this.api.sections());
      this.sections = [...sections].sort((a,b)=>b.year-a.year || a.course_name.localeCompare(b.course_name));
      if (!this.sections.some(s=>s.id===this.selectedSectionId)) this.selectedSectionId=this.sections[0]?.id || '';
      if (this.selectedSectionId) await this.loadRows();
    } catch(e){ this.error = this.api.errorMessage(e); }
    finally { this.loadingSections=false; this.cdr.markForCheck(); }
  }
  async loadRows(): Promise<void> {
    const sectionId = this.selectedSectionId;
    if (!sectionId) { this.rows=[];return; }
    this.loadingRows=true; this.error=''; this.rows=[];
    try {
      const gradebook = await firstValueFrom(this.api.gradebook(sectionId));
      const predictions = await Promise.all(gradebook.students.map(async row => {
        try { return await firstValueFrom(this.api.predict(row.student_id,sectionId)); }
        catch { return null; }
      }));
      // Consulta la predicción real y conserva el promedio actual del registro de notas.
      this.rows=gradebook.students.map((s,i)=>{
        const p: Prediction|null = predictions[i];
        return {
          id:s.student_id,code:s.code,name:s.full_name,
          attendance:p?.features.attendance_pct ?? null,
          homework:p?.features.homework_pct ?? null,
          average:s.current_average,
          projected:p?.predicted_final_grade ?? null,
          risk:(p?.risk_level ?? 'sin-dato') as RiskRow['risk'],
          modelVersion:p?.model_version ?? ''
        };
      }).sort((a,b)=>a.name.localeCompare(b.name));
      if (predictions.every(x=>x===null) && gradebook.students.length) {
        this.error='No se pudieron obtener las predicciones de ML. Revisa los indicadores del curso y el estado de FastAPI.';
      }
    } catch(e){ this.error=this.api.errorMessage(e); }
    finally { this.loadingRows=false; this.cdr.markForCheck(); }
  }
  export(): void {
    if (!this.selectedSection || !this.visibleRows.length) return;
    const body=makeCsv([
      ['Indicadores de riesgo académico — datos sintéticos de demostración'],
      [courseLabel(this.selectedSection)],
      [],
      ['Código','Estudiante','Asistencia (%)','Promedio actual','Cumplimiento tareas (%)','Proyección final','Riesgo','Modelo'],
      ...this.visibleRows.map(r=>[r.code,r.name,r.attendance,r.average,r.homework,r.projected,this.riskLabel(r.risk),r.modelVersion])
    ]);
    downloadCsv(`indicadores_riesgo_${this.selectedSection.id.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`,body);
  }
}
