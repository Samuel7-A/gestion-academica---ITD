import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input';
import { UsuarioService } from '../../../services/usuario.service';
import { Especialidad } from '../../../models/especialidad.model';
import { Usuario } from '../../../models/usuario.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomButtonComponent,
    CustomInputComponent
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private usuarioService = inject(UsuarioService);

  especialidadesList: Especialidad[] = [];
  selectedEspecialidades: Especialidad[] = [];

  private mensajeError = '';

  registerForm: FormGroup = this.fb.group({
    primerNombre: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    telefono: ['', [Validators.required, Validators.pattern(/^(?:\d\s*){9}$/)]],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  toggleEspecialidad(esp: Especialidad): void {
    const index = this.selectedEspecialidades.findIndex(item => item.id === esp.id);

    if (index === -1) {
      // No estaba seleccionada -> la agregamos
      this.selectedEspecialidades.push(esp);
    } else {
      // Ya estaba seleccionada -> la quitamos
      this.selectedEspecialidades.splice(index, 1);
    }
  }


  ngOnInit() {
    this.cargarEspecialidades();
  }

  cargarEspecialidades() {
    this.usuarioService.getCatalogoEspecialidades().subscribe(data => {
      this.especialidadesList = data;
    })
  }

  isEspecialidadSelected(esp: Especialidad): boolean {
    return this.selectedEspecialidades.includes(esp);
  }

  onSubmit(): void {
  if (this.registerForm.valid && this.selectedEspecialidades.length > 0) {
    const formValues = this.registerForm.value;

    // Separamos el string de 'apellidos' en partes por espacio
    const {apellido_uno, apellido_dos } = this.separarApellidos(formValues.apellidos);
    // Creamos el objeto user del tipo Usuario
    const user: Usuario = {
      ...formValues,
      apellido_uno: apellido_uno,
      apellido_dos: apellido_dos,
    };
    // Si tu interfaz Usuario no tiene la propiedad 'apellidos', la eliminamos del objeto
    delete (user as any).apellidos;
    this.usuarioService.newUsuario(user);
    this.router.navigate(['/auth/login'])
  } else {
    this.registerForm.markAllAsTouched();
  }
}

  onLoginRedirect(): void {
    this.router.navigate(['/auth/login'])
  }

  separarApellidos(apellidosCompletos: string): { apellido_uno: string; apellido_dos: string } {
    const limpio = apellidosCompletos.trim().replace(/\s+/g, ' ');

    if (!limpio) {
      return { apellido_uno: '', apellido_dos: '' };
    }

    const partes = limpio.split(' ');
    const apellido_uno = partes[0] || '';
    const apellido_dos = partes.slice(1).join(' ') || '';

    return { apellido_uno, apellido_dos };
  }
}