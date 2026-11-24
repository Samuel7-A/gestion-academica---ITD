import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { CustomButtonComponent } from "../../../shared/components/custom-button/custom-button";
import { CustomInputComponent } from "../../../shared/components/custom-input/custom-input";
import { UsuarioService } from "../../../services/usuario.service";
import { Usuario } from "../../../models/usuario";

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
      CommonModule,
      ReactiveFormsModule,
      CustomButtonComponent,
      CustomInputComponent
    ],
    templateUrl: './login.html',
    styleUrl: './login.css'
})

export class LoginComponent {
  private userService = inject(UsuarioService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);

  // Cambiado a público o protegido para que puedas mostrarlo en el HTML si lo necesitas
  mensajeError: string = '';
  docenteActual: Usuario | undefined = undefined;

  // Nota: en tu interfaz LoginRequest tienes 'email' y 'passwotd' (revisa si passwotd tiene un typo en el servicio)
  loginForm: FormGroup = this.formBuilder.group({
    usuario: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.mensajeError = ''; // Limpiamos errores previos
      
      const credentials = {
        email: this.loginForm.value.usuario,
        password: this.loginForm.value.password // Coincide con tu interfaz LoginRequest
      };

      this.userService.login(credentials).subscribe({
        next: (response) => {
          // El token ya se guarda automáticamente en el tap() de tu servicio
          this.docenteActual = response.user;
          
          // Redirigir al usuario a la ruta principal o dashboard
          this.router.navigate(['/principal/courses']);
        },
        error: (err) => {
          console.error('Error al iniciar sesión', );
          this.mensajeError = 'Correo o contraseña incorrectos.';
        }
      });

    } else {
      this.loginForm.markAllAsTouched();
      this.mensajeError = 'Por favor, complete los campos correctamente.';
    }
  }

  onRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}