import { DocenteEspecialidad } from "../models/docente-especialidad.model";

export const docenteEspecialidadMock: DocenteEspecialidad[] = [
    {
        id: "de-01",
        usuarioId: "usr-01",
        especialidadId: "esp-01", // Matemática
        grados_asignados: ["3ro", "4to", "5to"],
        horas_semanales: 16,
        es_titular: true,
        fecha_asignacion: "2026-03-01",
        activo: true
    },
    {
        id: "de-02",
        usuarioId: "usr-01",
        especialidadId: "esp-02", // Física (mismo docente, segunda especialidad)
        grados_asignados: ["4to", "5to"],
        horas_semanales: 8,
        es_titular: false,
        fecha_asignacion: "2026-03-01",
        activo: true
    },
    {
        id: "de-03",
        usuarioId: "usr-02",
        especialidadId: "esp-04", // Inglés
        grados_asignados: ["1ro", "2do", "3ro"],
        horas_semanales: 20,
        es_titular: true,
        fecha_asignacion: "2026-03-01",
        activo: true
    }
];