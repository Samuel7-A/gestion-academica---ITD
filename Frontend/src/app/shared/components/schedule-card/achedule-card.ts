import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-schedule-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule-card.html',
  styleUrls: ['./schedule-card.css']
})
export class ScheduleCardComponent {
  @Input({ required: true }) badgeText!: string;     // Ej: "CURSO - MARTES", "ACTIVIDAD - MIERCOLES"
  @Input({ required: true }) title!: string;         // Ej: "Matematicas 5°A", "Geometria 2°B"
  @Input() time?: string;                            // Ej: "Hora: 2:00 pm a 3:30 pm"
  @Input() description?: string;                     // Ej: "Presentación de Formar Poligona.."
  
  @Output() cardClick = new EventEmitter<void>();

  onClick(): void {
    this.cardClick.emit();
  }
}