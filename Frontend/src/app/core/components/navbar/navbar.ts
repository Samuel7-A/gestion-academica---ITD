import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsuarioService } from '../../../services/usuario.service';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    CustomButtonComponent,
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent {
  isMobileOpen = false;
  private router = inject(Router);
  private userService = inject(UsuarioService);

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

  onLogout(){
    console.log("Cerradno Sesion")
    this.userService.logout();
    this.router.navigate(["/auth/login"]);
  }

}