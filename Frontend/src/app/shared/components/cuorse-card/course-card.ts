import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-card.html',
  styleUrls: ['./course-card.css']
})
export class CourseCardComponent {
  @Input({ required: true }) courseName!: string;
  @Input({ required: true }) studentsCount!: number;
  @Input() category: string = 'Curso Activo';
  
  @Output() cardClick = new EventEmitter<void>();

  onCardClick(): void {
    this.cardClick.emit();
  }
}