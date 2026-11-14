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
  isMobileOpen = false;

  menuItems = [
    { label: 'Cursos', route: '/principal/courses' },
    { label: 'Registro de calificaciones', route: '/principal/courses/grades' },
    { label: 'Notas', route: '/principal/courses/performance' },
    { label: 'Exámenes', route: '/principal/courses/exams' },
    { label: 'Reportes', route: '/principal/courses/reports' },
    { label: 'Indicadores de riesgo', route: '/principal/courses/risks' },
    { label: 'Horario', route: '/principal/courses/schedule' }
  ];

  toggleMobileMenu(): void {
    this.isMobileOpen = !this.isMobileOpen;
  }

  closeMobileMenu(): void {
    this.isMobileOpen = false;
  }
}