import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { CustomButtonComponent } from "../../../shared/components/custom-button/custom-button";
import { CustomInputComponent } from "../../../shared/components/custom-input/custom-input";
import { UsuarioService } from "../../../services/usuario.service";
import { Usuario } from "../../../models/usuario.model";

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
  private form = inject(FormBuilder);
  private router = inject(Router);

  private mensajeError: string = '';
  private docenteActual: Usuario | undefined = undefined;

  loginForm: FormGroup = this.form.group({
    usuario: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.userService.getByCorreo(this.loginForm.get('usuario')?.value).subscribe(docente => {
          if(docente && docente.password == this.loginForm.get('password')?.value){
            this.mensajeError = '';
            this.docenteActual = docente;
            this.router.navigate(['/courses'])
          }else{
            this.mensajeError = 'Credenciales Incorrectas';
          }
      })
    } else {
      this.loginForm.markAllAsTouched();
      this.mensajeError = 'Credenciales Invalidades'
    }
  }

  onRegister(): void {
    this.router.navigate(['/auth/register'])
  }
}