import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PerformanceCardComponent } from '../../../shared/components/performance-card/performance-card';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input';

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

  // Formulario reactivo para los filtros superiores
  filterForm!: FormGroup;

  // Lista simulada de rendimiento por bimestre
  performanceList = [
    { periodName: '1er Bimestre', activityType: 'Examen', date: '12 Oct 2024', grade: '18.0', weight: '25%', status: 'Aprobado' as const },
    { periodName: '2do Bimestre', activityType: 'Examen', date: '24 Oct 2024', grade: '14.5', weight: '15%', status: 'Aprobado' as const },
    { periodName: '3er Bimestre', activityType: 'Examen', date: '02 Nov 2024', grade: '—', weight: '20%', status: 'En revisión' as const },
    { periodName: '4to Bimestre', activityType: 'Examen', date: '10 Nov 2024', grade: '09.0', weight: '10%', status: 'Reprobado' as const }
  ];

  courses = [
    { id: 1, name: 'Matemática 5°A' },
    { id: 2, name: 'Álgebra 4°B' },
    { id: 3, name: 'Cálculo 5°A' }
  ];

  activityTypes = [
    'Todas las actividades',
    'Examen',
    'Práctica Calificada',
    'Trabajo Final'
  ];

  ngOnInit(): void {
    // Inicialización del formulario de filtros con Reactive Forms
    this.filterForm = this.fb.group({
      selectedCourse: ['Matemática 5°A'],
      selectedActivityType: ['Todas las actividades'],
      searchQuery: ['']
    });
  }

  onFilterChange(): void {
    // Lógica para filtrar datos reactivamente según selección
    console.log('Filtros aplicados:', this.filterForm.value);
  }
}