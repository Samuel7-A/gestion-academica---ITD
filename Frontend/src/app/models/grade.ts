export interface Grade {
  id: string;
  activity_id: string;
  student_id: string;
  value: number; // 0 a 20
  updated_at: string; // ISO Date string (TIMESTAMP WITH TIME ZONE)
}