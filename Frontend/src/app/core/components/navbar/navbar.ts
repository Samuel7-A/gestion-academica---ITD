import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent {
  menuItems = [
    { label: 'Cursos', route: '/courses', icon: 'book' },
    { label: 'Registro de calificaciones', route: '/courses/grades', icon: 'clipboard' },
    { label: 'Notas', route: '/courses/notes', icon: 'file-text' },
    { label: 'Exámenes', route: '/courses/exams', icon: 'award' },
    { label: 'Reportes', route: '/courses/reports', icon: 'bar-chart' },
    { label: 'Indicadores de riesgo', route: '/courses/risks', icon: 'alert-triangle' },
    { label: 'Horario', route: '/courses/schedule', icon: 'calendar' }
  ];
}