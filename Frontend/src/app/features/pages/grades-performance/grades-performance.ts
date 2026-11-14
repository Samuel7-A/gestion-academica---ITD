import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AcademicoService } from '../../../services/academico-api.service';
import { PerformanceCardComponent } from '../../../shared/components/performance-card/performance-card';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input';
import { GradebookResponse, StudentGradebook } from '../../../models/Gradebook';

interface BimesterStat {
  bimesterNumber: number;
  bimesterTitle: string;
  averageScore: string;
  totalActivities: number;
  approvedCount: number;
  statusLabel: string;
  progressPercentage: number;
}


@Component({
  selector: 'app-grades-performance',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    PerformanceCardComponent, 
    CustomInputComponent
  ],
  templateUrl: './grades-performance.html',
  styleUrls: ['./grades-performance.css']
})

export class GradesPerformanceComponent implements OnInit {
  private fb = inject(FormBuilder);
  private academService = inject(AcademicoService);

  // Estados reactivos
  courses = signal<any[]>([]);
  performanceList = signal<any[]>([]); // Lista de actividades filtradas
  bimesterStats = signal<BimesterStat[]>([]); // Estadísticas calculadas por bimestre
  generalWeightedAverage = signal<string>('0.00');
  isLoading = signal<boolean>(false);

  // Almacén de datos originales
  private rawPerformanceData: any[] = [];
  private rawStudentsData: StudentGradebook[] = [];

  filterForm!: FormGroup;

  activityTypes = [
    'Todas las actividades',
    'Examen',
    'Práctica Calificada',
    'Trabajo Final'
  ];

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      selectedCourse: [null],
      selectedActivityType: ['Todas las actividades'],
      searchQuery: ['']
    });

    this.loadCourseSections();

    this.filterForm.get('selectedCourse')?.valueChanges.subscribe((sectionId) => {
      if (sectionId) {
        this.loadSectionPerformance(sectionId);
      }
    });

    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  loadCourseSections(): void {
    this.isLoading.set(true);
    this.academService.getCourseSections().subscribe({
      next: (data) => {
        const sections = Array.isArray(data) ? data : [];
        this.courses.set(sections);

        if (sections.length > 0) {
          const firstId = sections[0].id;
          this.filterForm.get('selectedCourse')?.setValue(firstId, { emitEvent: false });
          this.loadSectionPerformance(firstId);
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Error al cargar secciones de cursos:', err);
        this.isLoading.set(false);
      }
    });
  }

  loadSectionPerformance(courseSectionId: string | number): void {
    this.isLoading.set(true);

    this.academService.getGradebook(courseSectionId).subscribe({
      next: (response: GradebookResponse) => {
        const activities = response.activities || [];
        this.rawStudentsData = response.students || [];

        // 1. Mapeo de actividades para la tabla de rendimiento
        this.rawPerformanceData = activities.map((act: any, index: number) => ({
          periodName: `Bimestre ${act.bimester || 1}`,
          bimesterNum: act.bimester || 1,
          activityType: act.title || 'Evaluación',
          date: 'Reciente',
          grade: '—', 
          weight: '25%',
          status: index % 2 === 0 ? 'Aprobado' : 'En revisión'
        }));

        // 2. Calcular las estadísticas de los 4 bimestres de forma matemática y segura
        this.computeBimesterStatistics(activities, this.rawStudentsData);

        // 3. Calcular el promedio ponderado general de la sección
        this.computeGeneralAverage(this.rawStudentsData);

        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar el gradebook:', err);
        this.rawPerformanceData = [];
        this.rawStudentsData = [];
        this.performanceList.set([]);
        this.bimesterStats.set([]);
        this.generalWeightedAverage.set('0.00');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Ciclo analítico para calcular el cuadro estadístico de los 4 bimestres
   */
  private computeBimesterStatistics(activities: any[], students: StudentGradebook[]): void {
    const stats: BimesterStat[] = [];

    for (let bim = 1; bim <= 4; bim++) {
      // Filtrar actividades correspondientes a este bimestre
      const bimActivities = activities.filter(a => (a.bimester || 1) === bim);
      
      // Extraer notas de los estudiantes para este bimestre específico
      let totalSum = 0;
      let countGrades = 0;

      students.forEach(student => {
        if (student.bimester_averages) {
          // Buscamos si existe un promedio directo para este bimestre en la estructura del alumno
          const bimKey = `bimester_${bim}` as keyof typeof student.bimester_averages;
          const bimAvg = student.bimester_averages[bimKey];
          if (typeof bimAvg === 'number' && !isNaN(bimAvg)) {
            totalSum += bimAvg;
            countGrades++;
          }
        }
      });

      const calculatedAverage = countGrades > 0 ? (totalSum / countGrades) : 0.00;
      const progressPercent = Math.min(Math.round((calculatedAverage / 20) * 100), 100);

      stats.push({
        bimesterNumber: bim,
        bimesterTitle: `Bimestre ${bim}`,
        averageScore: calculatedAverage.toFixed(2),
        totalActivities: bimActivities.length,
        approvedCount: countGrades,
        statusLabel: calculatedAverage >= 11 ? 'Rendimiento Óptimo' : (calculatedAverage > 0 ? 'En Progreso' : 'Sin Evaluaciones'),
        progressPercentage: progressPercent
      });
    }

    this.bimesterStats.set(stats);
  }

  private computeGeneralAverage(students: StudentGradebook[]): void {
    if (!students || students.length === 0) {
      this.generalWeightedAverage.set('0.00');
      return;
    }

    const validAverages = students
      .map(s => s.current_average)
      .filter(avg => typeof avg === 'number' && !isNaN(avg));

    if (validAverages.length === 0) {
      this.generalWeightedAverage.set('0.00');
      return;
    }

    const sum = validAverages.reduce((acc, curr) => acc + curr, 0);
    const overall = sum / validAverages.length;
    this.generalWeightedAverage.set(overall.toFixed(2));
  }

  applyFilters(): void {
    const { selectedActivityType, searchQuery } = this.filterForm.value;
    let filtered = [...this.rawPerformanceData];

    if (selectedActivityType && selectedActivityType !== 'Todas las actividades') {
      filtered = filtered.filter(item => 
        item.activityType.toLowerCase().includes(selectedActivityType.toLowerCase())
      );
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.periodName.toLowerCase().includes(query) ||
        item.activityType.toLowerCase().includes(query)
      );
    }

    this.performanceList.set(filtered);
  }
}