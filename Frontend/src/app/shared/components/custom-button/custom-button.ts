import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-button.html',
  styleUrls: ['./custom-button.css']
})
export class CustomButtonComponent {
  @Input({ required: true }) text: string = 'Botón';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() customClass: string = ''; // Permite pasar clases CSS adicionales
  
  // Emite la función o evento hacia el componente padre
  @Output() clicked = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent): void {
    if (!this.disabled) {
      this.clicked.emit(event);
    }
  }
}