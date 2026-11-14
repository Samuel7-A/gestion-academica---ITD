export interface AcademicIndicator {
  student_id: string;
  course_section_id: string;
  attendance_pct: number; // 0 a 100
  homework_pct: number; // 0 a 100
  participation_pct: number; // 0 a 100
  previous_average?: number | null; // 0 a 20
}