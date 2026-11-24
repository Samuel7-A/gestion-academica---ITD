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
  @Input({ required: true }) periodName!: string;
  @Input({ required: true }) activityType!: string;
  @Input({ required: true }) date!: string;
  @Input({ required: true }) grade!: string;
  @Input({ required: true }) weight!: string;
  @Input({ required: true }) status!: 'Con notas' | 'Sin notas';
}
