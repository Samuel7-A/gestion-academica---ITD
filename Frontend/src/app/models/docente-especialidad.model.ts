import { Especialidad } from "./especialidad.model";
import { Usuario } from "./usuario.model";


export interface DocenteEspecialidad {
    id: string;
    usuarioId: string;           // Llave foránea hacia Usuario
    especialidadId: string;      // Llave foránea hacia especialidad
    grados_asignados: string[];  // Ej: ["3ro", "4to", "5to"]
    horas_semanales: number;     // Ej: 12
    es_titular: boolean;         // Indica si es su especialidad principal
    fecha_asignacion: string;    // Ej: "2026-03-01"
    activo: boolean;
    
    // Opcional: para cuando el backend o servicio devuelva los datos poblados (JOIN)
    usuario?: Usuario;
    especialidad?: Especialidad;
}
