import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AcademicApiService } from '../../../services/academic-api.service';

@Component({
  selector: 'app-api-session',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './api-session.html',
  styleUrls: ['./api-session.css']
})
export class ApiSessionComponent {
  @Output() connected = new EventEmitter<void>();
  private readonly api = inject(AcademicApiService);
  email = '';
  password = '';
  busy = false;
  error = '';

  async connect(): Promise<void> {
    if (!this.email.trim() || !this.password) {
      this.error = 'Ingresa el correo y la contraseña del docente.';
      return;
    }
    this.busy = true;
    this.error = '';
    try {
      await firstValueFrom(this.api.authenticate(this.email.trim(), this.password));
      this.password = '';
      this.connected.emit();
    } catch (e) {
      this.error = this.api.errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
}
