import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';


import { Activity } from '../../../models/activity';
import { AcademicoService } from '../../../services/academico-api.service';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button';

@Component({
  selector: 'app-grades-page',
  standalone: true,
  imports: [CommonModule, CustomButtonComponent],
  templateUrl: './grades-pages.html',
  styleUrls: ['./grades-pages.css']
})
export class GradesPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private academService = inject(AcademicoService);

  isLoading = signal<boolean>(true);
  courseSectionId = signal<string | null>(null);

  activities = signal<Activity[]>([]);
  studentsList = signal<any[]>([]);
  courseInfo = signal<any>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.courseSectionId.set(id);
        this.cargarGradebook(id);
      }
    });
  }

  cargarGradebook(sectionId: string): void {
    this.isLoading.set(true);

    this.academService.getGradebook(sectionId).subscribe({
      next: (response) => {
        // Asignamos la información del curso, actividades y estudiantes desde el JSON del servidor
        this.courseInfo.set(response.course_section || null);
        this.activities.set(Array.isArray(response.activities) ? response.activities : []);
        this.studentsList.set(Array.isArray(response.students) ? response.students : []);

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar el gradebook:', err);
        this.activities.set([]);
        this.studentsList.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // Método auxiliar para buscar la nota de un estudiante según el ID de la actividad
  getGradeForActivity(student: any, activityId: string): number | null {
    if (!student.grades || !Array.isArray(student.grades)) return null;
    const found = student.grades.find((g: any) => g.activity_id === activityId);
    return found ? found.value : 0;
  }

  goBack(): void {
    this.router.navigate(['/principal/courses']);
  }

  onExport(): void {
    console.log('Exportar reporte de notas');
  }

  // Signal o variable para almacenar el promedio general de todos los estudiantes de la tabla
  generalClassAverage = signal<string>('0.00');

  // Estado para el botón de editar
  isEditing = false;

  // Método para calcular el promedio global de la tabla
  calcularPromedioGeneral(students: any[]): void {
    if (!Array.isArray(students) || students.length === 0) {
      this.generalClassAverage.set('0.00');
      return;
    }

    const sumaTotal = students.reduce((acc, student) => {
      return acc + (Number(student.current_average) || 0);
    }, 0);

    const promedio = sumaTotal / students.length;
    this.generalClassAverage.set(promedio.toFixed(2));
  }

  // Alternar el estado de edición al presionar el botón
  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }
}