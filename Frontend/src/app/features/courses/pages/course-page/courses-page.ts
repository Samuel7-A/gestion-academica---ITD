import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../../../core/components/navbar/navbar';
import { CourseCardComponent } from '../../../../shared/components/cuorse-card/course-card';
import { ActivityCardComponent } from '../../../../shared/components/activity-card/activity-card';

interface Course {
  name: string;
  students: number;
}

interface Activity {
  type: string;
  day: string;
  title: string;
  detail: string;
}

@Component({
  selector: 'app-courses-page',
  standalone: true,
  imports:
    [CommonModule,
      NavbarComponent,
      CourseCardComponent,
      ActivityCardComponent,
    ],
  templateUrl: './courses-page.html',
  styleUrls: ['./courses-page.css']
})
export class CoursesPageComponent {
  courses: Course[] = [
    { name: 'Calculo 5°A', students: 29 },
    { name: 'Matematica 5° A', students: 29 },
    { name: 'Matematica 5°B', students: 29 },
    { name: 'Geografia 5°C', students: 29 },
    { name: 'Geografia 2°C', students: 29 },
    { name: 'Aritmetica 5°A', students: 29 },
    { name: 'Aritmetica 2°A', students: 29 },
    { name: 'Matematica 4°A', students: 29 },
    { name: 'Geografia 3°A', students: 29 },
    { name: 'Calculo 5°B', students: 29 },
    { name: 'Calculo 5°C', students: 29 }
  ];

  activities: Activity[] = [
    { type: 'Curso', day: 'Martes', title: 'Matematicas 5°A', detail: 'Hora: 2:00 pm a 3:30 pm' },
    { type: 'Actividad', day: 'Miercoles', title: 'Geometria 2°B', detail: 'Presentación de Formar Poligona..' },
    { type: 'Prueba', day: 'Martes', title: 'Aritmetica 3°B', detail: 'Funciones Cuadraticas, num....' }
  ];
}