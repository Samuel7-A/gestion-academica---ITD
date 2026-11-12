import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {

  private fb = inject(FormBuilder);
  private router = inject(Router);

  especialidadesList: string[] = [
    'MATEMATICAS', 
    'COMUNICACION', 
    'CIENCIAS', 
    'LITERATURA', 
    'EDUCACIÓN FISICA', 
    'QUIMICA'
  ];

  selectedEspecialidades: string[] = [];

  registerForm: FormGroup = this.fb.group({
    primerNombre: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  toggleEspecialidad(esp: string): void {
    const index = this.selectedEspecialidades.indexOf(esp);
    if (index > -1) {
      this.selectedEspecialidades.splice(index, 1);
    } else {
      this.selectedEspecialidades.push(esp);
    }
  }

  isEspecialidadSelected(esp: string): boolean {
    return this.selectedEspecialidades.includes(esp);
  }

  onSubmit(): void {
    if (this.registerForm.valid && this.selectedEspecialidades.length > 0) {
      const formData = {
        ...this.registerForm.value,
        especialidades: this.selectedEspecialidades
      };
      console.log('Datos de Registro:', formData);
    } else {
      this.registerForm.markAllAsTouched();
    }
  }

  onLoginRedirect(): void {
    this.router.navigate(['/auth'])
  }
}