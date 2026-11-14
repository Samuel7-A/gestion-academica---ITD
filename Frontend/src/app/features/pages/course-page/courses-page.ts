import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CourseCardComponent } from '../../../shared/components/cuorse-card/course-card';
import { ScheduleCardComponent } from '../../../shared/components/schedule-card/achedule-card';
import { Activity } from '../../../models/activity';
import { AcademicoService } from '../../../services/academico-api.service';
import { CourseSection } from '../../../models/courseSection';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-courses-page',
  standalone: true,
  imports:
    [CommonModule,
      CourseCardComponent,
      ScheduleCardComponent,
    ],
  templateUrl: './courses-page.html',
  styleUrls: ['./courses-page.css']
})

export class CoursesPageComponent {

  router = inject(Router);
  academService = inject(AcademicoService);

  public courses = signal<CourseSection[]>([]);
  public actividades = signal<Activity[]>([]);

  onSelectCurse(courseId: string): void {
    this.router.navigate(['principal/courses/grades', courseId]);
  }

  ngOnInit() {
    this.cargarCursosYActividades();
  }

  private cargarCursosYActividades() {
    this.academService.getCourseSections().pipe(
      // 1. Tomamos los cursos y disparamos peticiones paralelas para cada uno
      switchMap((courses: CourseSection[]) => {
        this.courses.set(courses);

        if (!courses || courses.length === 0) {
          return of([]); // Si no hay cursos, retornamos un observable vacío
        }

        // Creamos un arreglo de observables (uno por cada curso usando su id)
        const activityRequests = courses.map(course =>
          this.academService.getActivitiesBySection(course.id).pipe(
            catchError(err => {
              console.error(`Error al cargar actividades del curso ${course.id}`, err);
              return of([]); // Si un curso falla, devolvemos un arreglo vacío para no tumbar todo el proceso
            })
          )
        );

        // 2. Ejecutamos todas las peticiones en paralelo
        return forkJoin(activityRequests);
      })
    ).subscribe({
      next: (responses: Activity[][]) => {
        // 3. 'responses' es un arreglo de arreglos. Usamos .flat() para unificarlos en uno solo.
        const allActivities = responses.flat();
        this.actividades.set(allActivities);
      },
      error: (err) => {
        console.error('Error general al procesar cursos y actividades', err);
      }
    });
  }

  irACurso() {

  }

  public isActivitiesOpen: boolean = false;

  public toggleActivitiesMobile(): void {
    this.isActivitiesOpen = !this.isActivitiesOpen;
  }
}
