import { Activity } from "./activity";

// Si prefieres tiparlo con una interfaz clara:
export interface GradebookResponse {
  course_section: any;
  activities: Activity[];
  students: StudentGradebook[];
}

export interface StudentGradebook {
  student_id: string;
  code: string;
  full_name: string;
  grades: { activity_id: string; value: number; updated_at: string }[];
  bimester_averages: { bimester_1: number; bimester_2: number; bimester_3: number; bimester_4: number };
  current_average: number;
}