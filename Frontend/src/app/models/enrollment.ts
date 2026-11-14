import { CourseSection } from "./courseSection";
import { Student } from "./student";

export interface Enrollment {
  id: string;
  student_id: string;
  course_section_id: string;
  // Opcional: Relaciones expandidas
  student?: Student;
  course_section?: CourseSection;
}