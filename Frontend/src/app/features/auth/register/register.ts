import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService } from '../../../services/usuario.service';
@Component({selector:'app-register',standalone:true,imports:[CommonModule,ReactiveFormsModule],templateUrl:'./register.html',styleUrls:['./register.css']})
export class RegisterComponent {
  private fb=inject(FormBuilder);private router=inject(Router);private route=inject(ActivatedRoute);private users=inject(UsuarioService);
  readonly busy=signal(false);readonly error=signal('');readonly success=signal('');
  readonly registerForm=this.fb.nonNullable.group({
    full_name:['',[Validators.required,Validators.minLength(2)]],
    email:['',[Validators.required,Validators.email]],
    password:['',[Validators.required,Validators.minLength(12)]],
    confirm_password:['',[Validators.required]],
    invite_token:['',[Validators.required,Validators.minLength(32)]]
  });
  constructor(){const invite=this.route.snapshot.queryParamMap.get('invite');if(invite)this.registerForm.patchValue({invite_token:invite});}
  onSubmit():void{
    if(this.busy())return;
    if(this.registerForm.invalid){this.registerForm.markAllAsTouched();return;}
    const {full_name,email,password,confirm_password,invite_token}=this.registerForm.getRawValue();
    if(password!==confirm_password){this.error.set('Las contraseñas no coinciden.');return;}
    this.busy.set(true);this.error.set('');
    this.users.register({full_name,email:email.trim().toLowerCase(),password,invite_token}).subscribe({
      next:()=>{this.busy.set(false);this.success.set('Cuenta creada. Ya puedes iniciar sesión.');this.registerForm.reset();},
      error:e=>{this.busy.set(false);this.error.set(typeof e?.error?.detail==='string'?e.error.detail:'Registro rechazado. Comprueba la invitación y la conexión.');}
    });
  }
  onLoginRedirect():void{this.router.navigate(['/auth/login']);}
}
