import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-performance-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './performance-card.html',
  styleUrls: ['./performance-card.css']
})
export class PerformanceCardComponent {
  // Datos del bimestre recibidos desde el componente padre
  @Input({ required: true }) periodName!: string;   // Ej: "1er Bimestre"
  @Input({ required: true }) activityType!: string; // Ej: "Examen"
  @Input({ required: true }) date!: string;         // Ej: "12 Oct 2024"
  @Input({ required: true }) grade!: string;        // Ej: "18.0" o "—"
  @Input({ required: true }) weight!: string;       // Ej: "25%"
  @Input({ required: true }) status!: 'Aprobado' | 'En revisión' | 'Reprobado';
}