"""Hash de contraseñas (bcrypt) y tokens JWT."""

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from app.core.config import settings

# bcrypt solo usa los primeros 72 bytes de la contraseña.
_BCRYPT_MAX_BYTES = 72


def _to_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_to_bytes(password), bcrypt.gensalt(rounds=settings.bcrypt_rounds)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bytes(password), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> tuple[str, int]:
    """Devuelve (token, segundos_de_validez)."""
    expires_in = settings.jwt_expire_minutes * 60
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
        **(extra_claims or {}),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> dict[str, Any]:
    """Lanza jwt.PyJWTError si el token es inválido o expiró."""
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
