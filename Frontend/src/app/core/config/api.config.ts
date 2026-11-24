// Una sola dirección de API para los módulos académicos.
// Angular se conecta a FastAPI; nunca directamente a la base PostgreSQL/Supabase.
// En producción se define window.__ITD_API_URL__ en /runtime-config.js (URL pública, nunca secretos).
declare global { interface Window { __ITD_API_URL__?: string } }
export const ACADEMIC_API_URL = (window.__ITD_API_URL__ || 'http://localhost:8000/api/v1').replace(/\/$/, '');
