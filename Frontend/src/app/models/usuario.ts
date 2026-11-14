export interface Usuario {
  id: string;
  email: string;
  role: 'teacher' | 'admin';
  full_name?: string | null;
}