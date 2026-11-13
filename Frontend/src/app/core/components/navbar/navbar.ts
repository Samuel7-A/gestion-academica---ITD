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
    { label: 'Cursos', route: '/courses' },
    { label: 'Registro de calificaciones', route: '/courses/grades' },
    { label: 'Notas', route: '/courses/performance' },
    { label: 'Exámenes', route: '/courses/exams' },
    { label: 'Reportes', route: '/courses/reports' },
    { label: 'Indicadores de riesgo', route: '/courses/risks' },
    { label: 'Horario', route: '/courses/schedule' }
  ];

  toggleMobileMenu(): void {
    this.isMobileOpen = !this.isMobileOpen;
  }

  closeMobileMenu(): void {
    this.isMobileOpen = false;
  }
}