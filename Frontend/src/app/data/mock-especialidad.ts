import { Especialidad } from "../models/especialidad.model";

// Catálogo base de especialidades
export const especialidadesMock: Especialidad[] = [
    {
        id: "esp-01",
        nombre: "Matemática",
        codigo: "MAT-SEC",
        descripcion: "Álgebra, Geometría y Trigonometría",
        activo: true
    },
    {
        id: "esp-02",
        nombre: "Física",
        codigo: "FIS-SEC",
        descripcion: "Física elemental y laboratorio",
        activo: true
    },
    {
        id: "esp-03",
        nombre: "Comunicación",
        codigo: "COM-SEC",
        descripcion: "Lenguaje, Literatura y Razonamiento Verbal",
        activo: true
    },
    {
        id: "esp-04",
        nombre: "Inglés",
        codigo: "ING-SEC",
        descripcion: "Inglés intermedio y avanzado",
        activo: true
    }
];