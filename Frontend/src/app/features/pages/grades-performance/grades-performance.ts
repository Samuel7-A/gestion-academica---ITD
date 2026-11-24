import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AcademicoService } from '../../../services/academico-api.service';
import { PerformanceCardComponent } from '../../../shared/components/performance-card/performance-card';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input';
import { GradebookResponse } from '../../../models/Gradebook';
import { analyzeGradebook, ActivityStatRow, BimesterSummary } from './grades-analytics';

@Component({
  selector: 'app-grades-performance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PerformanceCardComponent, CustomInputComponent],
  templateUrl: './grades-performance.html',
  styleUrls: ['./grades-performance.css']
})
export class GradesPerformanceComponent implements OnInit {
  private fb = inject(FormBuilder);
  private academService = inject(AcademicoService);

  courses = signal<any[]>([]);
  performanceList = signal<ActivityStatRow[]>([]);
  bimesterStats = signal<BimesterSummary[]>([]);
  generalWeightedAverage = signal<string>('—'); // Nombre conservado por compatibilidad con el HTML existente.
  totalStudents = signal(0);
  totalActivities = signal(0);
  gradesRecorded = signal(0);
  studentsWithAverage = signal(0);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  private rawPerformanceData: ActivityStatRow[] = [];
  private lastRequestId = 0;
  filterForm!: FormGroup;

  activityTypes = ['Todas las actividades', 'Examen', 'Práctica Calificada', 'Trabajo Final'];

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      selectedCourse: [null],
      selectedActivityType: ['Todas las actividades'],
      searchQuery: ['']
    });
    this.loadCourseSections();
    this.filterForm.get('selectedCourse')?.valueChanges.subscribe(sectionId => {
      if (sectionId) this.loadSectionPerformance(sectionId);
    });
    this.filterForm.valueChanges.subscribe(() => this.applyFilters());
  }

  loadCourseSections(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.academService.getCourseSections().subscribe({
      next: data => {
        const sections = Array.isArray(data) ? data : [];
        this.courses.set(sections);
        if (!sections.length) {
          this.errorMessage.set('No hay cursos asignados para consultar.');
          this.isLoading.set(false);
          return;
        }
        const firstId = sections[0].id;
        this.filterForm.get('selectedCourse')?.setValue(firstId, { emitEvent: false });
        this.loadSectionPerformance(firstId);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los cursos. Comprueba la sesión y FastAPI.');
        this.isLoading.set(false);
      }
    });
  }

  loadSectionPerformance(courseSectionId: string | number): void {
    const requestId = ++this.lastRequestId;
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.academService.getGradebook(courseSectionId).subscribe({
      next: (response: GradebookResponse) => {
        // No se muestran respuestas obsoletas si el docente cambia de curso rápidamente.
        if (requestId !== this.lastRequestId) return;
        const summary = analyzeGradebook(response.activities || [], response.students || []);
        this.rawPerformanceData = summary.activities;
        this.bimesterStats.set(summary.bimesters);
        this.generalWeightedAverage.set(summary.overallAverage);
        this.totalStudents.set(summary.totalStudents);
        this.totalActivities.set(summary.totalActivities);
        this.gradesRecorded.set(summary.gradesRecorded);
        this.studentsWithAverage.set(summary.studentsWithAverage);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: () => {
        if (requestId !== this.lastRequestId) return;
        this.rawPerformanceData = [];
        this.performanceList.set([]);
        this.bimesterStats.set([]);
        this.generalWeightedAverage.set('—');
        this.totalStudents.set(0);
        this.totalActivities.set(0);
        this.gradesRecorded.set(0);
        this.studentsWithAverage.set(0);
        this.errorMessage.set('No se pudo consultar el registro de calificaciones. Reintenta o comprueba FastAPI.');
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    if (!this.filterForm) return;
    const selectedType = String(this.filterForm.value.selectedActivityType || '');
    const search = String(this.filterForm.value.searchQuery || '').toLowerCase().trim();
    this.performanceList.set(this.rawPerformanceData.filter(item => {
      if (selectedType && selectedType !== 'Todas las actividades' &&
          !item.activityType.toLowerCase().includes(selectedType.toLowerCase())) return false;
      return !search || item.activityType.toLowerCase().includes(search) ||
        item.periodName.toLowerCase().includes(search);
    }));
  }
}
