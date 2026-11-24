"""Alta segura de administrador sin contraseña hardcodeada.

Desde Backend, con DATABASE_URL configurada y las migraciones aplicadas:
    python -m app.cli.create_admin --email responsable@institucion.edu.pe

La contraseña se solicita en consola sin eco; no se escribe en historial ni Git.
"""
from __future__ import annotations

import argparse
import getpass
import uuid

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import User
from app.api.routes.extended import normalize_email


def main() -> None:
    p = argparse.ArgumentParser(description="Crear cuenta administrativa segura")
    p.add_argument("--email", required=True)
    p.add_argument("--name", default="Administrador")
    args = p.parse_args()
    email = normalize_email(args.email)
    pwd = getpass.getpass("Contraseña nueva (mínimo 12 caracteres): ")
    if len(pwd) < 12 or len(pwd.encode("utf-8")) > 72:
        raise SystemExit("Contraseña incorrecta: usa entre 12 y 72 bytes")
    if getpass.getpass("Confirma la contraseña: ") != pwd:
        raise SystemExit("Las contraseñas no coinciden")
    with SessionLocal() as db:
        if db.scalar(select(User.id).where(User.email == email)):
            raise SystemExit("El correo ya existe. No se sobrescribió ningún usuario")
        db.add(User(id=f"USR-ADM-{uuid.uuid4().hex[:20].upper()}", email=email,
                    role="admin", full_name=args.name.strip(), password_hash=hash_password(pwd)))
        db.commit()
    print("Administrador creado sin mostrar la contraseña")


if __name__ == "__main__":
    main()
