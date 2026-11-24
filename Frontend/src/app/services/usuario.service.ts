import { inject, Injectable, signal } from "@angular/core";
import { ACADEMIC_API_URL } from "../core/config/api.config";
import { HttpClient } from "@angular/common/http";
import { Usuario } from "../models/usuario";
import { Observable, tap } from "rxjs";

interface LoginRequest{
  email: string,
  password: string
}

interface AuthResponse{
  access_token : string,
  token_type : string,
  expires_in : 0,
  user : Usuario
}

@Injectable({
  providedIn: 'root'
})

export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly api = `${ACADEMIC_API_URL}/auth`;

  // 1. Signal privado que recupera el usuario guardado de forma segura
  private currentUserSignal = signal<Usuario | null>(this.getStoredUser());

  // 2. Signal público de solo lectura para consumir en la app
  public readonly currentUser = this.currentUserSignal.asReadonly();

  /**
   * Inicia sesión, persiste el token y el usuario, y actualiza el signal reactivo.
   */
  login(credenciales: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/login`, credenciales).pipe(
      tap((respuesta) => {
        if (respuesta.access_token) {
          localStorage.setItem('auth_token', respuesta.access_token);
          localStorage.setItem('current_user', JSON.stringify(respuesta.user));
          this.currentUserSignal.set(respuesta.user);
        }
      })
    );
  }

  /**
   * Cierra la sesión limpiando el almacenamiento local y reseteando el signal.
   */
  /** Registro exclusivamente por invitación de un administrador. */
  register(body: { full_name: string; email: string; password: string; invite_token: string }): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.api}/register`, body);
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    this.currentUserSignal.set(null);
  }

  /**
   * Getter síncrono para verificar rápidamente si existe una sesión activa.
   */
  get hasSession(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  /**
   * Método auxiliar privado para recuperar el usuario de manera segura ante fallos de parseo.
   */
  private getStoredUser(): Usuario | null {
    const userStr = localStorage.getItem('current_user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as Usuario;
    } catch (error) {
      console.error('Error al parsear el usuario almacenado en localStorage:', error);
      localStorage.removeItem('current_user'); // Limpieza preventiva si el JSON está corrupto
      return null;
    }
  }
}