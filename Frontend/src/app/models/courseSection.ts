import { Course } from "./course";
import { Section } from "./section";
import { User } from "./usuario";

export interface CourseSection {
  id: string;
  course_id: string;
  section_id: string;
  teacher_id: string;
  // Opcional: Relaciones expandidas si el backend hace JOINs
  course?: Course;
  section?: Section;
  teacher?: User;
}