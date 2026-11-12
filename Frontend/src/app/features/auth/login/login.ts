import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { Router } from "@angular/router";


@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.html',
    styleUrl: './login.css'
})

export class LoginComponent {
  private form = inject(FormBuilder);
  private router = inject(Router);

  loginForm: FormGroup = this.form.group({
    usuario: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    if (this.loginForm.valid) {
      console.log('Datos del formulario:', this.loginForm.value);
      this.router.navigate(['/courses'])
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  onRegister(): void {
    this.router.navigate(['/register'])
  }
}