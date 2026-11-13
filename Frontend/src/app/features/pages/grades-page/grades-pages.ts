import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input';

interface StudentGrade {
  id: number;
  name: string;
  act1: number;
  act2: number;
  act3: number;
}

@Component({
  selector: 'app-grades-page',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    CustomButtonComponent, 
    CustomInputComponent
  ],
  templateUrl: './grades-pages.html',
  styleUrls: ['./grades-pages.css']
})
export class GradesPageComponent {
  private fb = inject(FormBuilder);

  isEditing = false;
  lastSavedText = 'Guardado automático · hace 2 min';

  initialStudents: StudentGrade[] = [
    { id: 1, name: 'Ana Torres', act1: 16, act2: 14, act3: 17 },
    { id: 2, name: 'Bruno Lima', act1: 12, act2: 15, act3: 13 },
    { id: 3, name: 'Carla Rojas', act1: 18, act2: 17, act3: 19 },
    { id: 4, name: 'Diego Salas', act1: 10, act2: 12, act3: 11 },
    { id: 5, name: 'Elena Vidal', act1: 15, act2: 16, act3: 14 },
    { id: 6, name: 'Fabián Cruz', act1: 17, act2: 18, act3: 16 }
  ];

  gradesForm: FormGroup = this.fb.group({
    students: this.fb.array(
      this.initialStudents.map(student => this.createStudentGroup(student))
    )
  });

  get studentsArray(): FormArray {
    return this.gradesForm.get('students') as FormArray;
  }

  private createStudentGroup(student: StudentGrade): FormGroup {
    return this.fb.group({
      id: [student.id],
      name: [student.name],
      act1: [student.act1, [Validators.required, Validators.min(0), Validators.max(20)]],
      act2: [student.act2, [Validators.required, Validators.min(0), Validators.max(20)]],
      act3: [student.act3, [Validators.required, Validators.min(0), Validators.max(20)]]
    });
  }

  getAverage(index: number): string {
    const group = this.studentsArray.at(index);
    const n1 = Number(group.get('act1')?.value) || 0;
    const n2 = Number(group.get('act2')?.value) || 0;
    const n3 = Number(group.get('act3')?.value) || 0;
    return ((n1 + n2 + n3) / 3).toFixed(1);
  }

  toggleEdit(): void {
    if (this.isEditing && this.gradesForm.invalid) {
      this.gradesForm.markAllAsTouched();
      return;
    }
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.lastSavedText = 'Guardado automático · hace un momento';
    }
  }

  onImport(): void {
    console.log('Importar notas');
  }

  onExport(): void {
    console.log('Exportar reporte:', this.gradesForm.value);
  }
}