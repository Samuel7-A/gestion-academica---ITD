// src/app/models/course-section.model.ts

export interface CourseSection {
  id: string;
  course_id: string;
  course_name: string;
  section_id: string;
  year: number;
  grade_level: string;
  section_name: string;
  teacher_id: string;
  student_count: number;
}