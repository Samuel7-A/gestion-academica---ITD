import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.css']
})
export class TopbarComponent {
  @Input() lastSavedText?: string;
  @Input() userInitial: string = 'D';
  @Input() showAutosave: boolean = false;

  public readonly userService = inject(UsuarioService);

}