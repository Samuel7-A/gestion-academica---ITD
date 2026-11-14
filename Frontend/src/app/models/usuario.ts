export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'teacher' | 'admin';
  full_name?: string | null;
}