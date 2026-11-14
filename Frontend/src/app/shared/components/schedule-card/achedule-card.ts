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
  badgeText!: "Curso - Actividades";     // Ej: "CURSO - MARTES", "ACTIVIDAD - MIERCOLES"
  @Input({ required: true }) title!: string;         // Ej: "Matematicas 5°A", "Geometria 2°B"
  @Input() bimestre?: number;                            // Ej: "Hora: 2:00 pm a 3:30 pm"  
  @Output() cardClick = new EventEmitter<void>();

  onClick(): void {
    this.cardClick.emit();
  }
}