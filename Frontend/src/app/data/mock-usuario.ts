import { Usuario } from "../models/usuario.model";
import { especialidadesMock } from "./mock-especialidad";
export const usuariosMock: Usuario[] = [
    {
        id: "usr-01",
        nombre: "Carlos",
        apellido_uno: "Mendoza",
        apellido_dos: "Quispe",
        telefono: "987654321",
        correo: "cmendoza@colegioprivado.edu.pe",
        password: "hashed_password_123",
        activo: true,
    },
    {
        id: "usr-02",
        nombre: "Valeria",
        apellido_uno: "Salazar",
        apellido_dos: "Torres",
        telefono: "912345678",
        correo: "vsalazar@colegioprivado.edu.pe",
        password: "hashed_password_456",
        activo: true,
    }
];