#!/usr/bin/env python3
"""Comprueba modelo real, predicción y grupos vía FastAPI; escribe evidencia JSON sin credenciales.

Uso (PowerShell, desde la raíz del repo):
  $env:APF3_EMAIL = 'docente1@demo.edu.pe'
  $env:APF3_PASSWORD = '<clave de demostración>'
  python scripts/verificar_ml_integracion.py --base-url http://localhost:8000
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def call(base: str, path: str, method: str = 'GET', payload: dict | None = None, token: str = '') -> dict:
    data = json.dumps(payload).encode('utf-8') if payload is not None else None
    headers = {'Accept': 'application/json'}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = Request(base.rstrip('/') + '/api/v1' + path, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=20) as res:
            return json.load(res)
    except HTTPError as e:
        raise RuntimeError(f'{method} {path}: HTTP {e.code}') from e
    except URLError as e:
        raise RuntimeError(f'{method} {path}: conexión fallida ({e.reason})') from e


def validate(base: str, email: str, password: str, student: str, section: str, n_groups: int) -> dict:
    health = call(base, '/health')
    assert health.get('status') == 'ok' and health.get('database') == 'ok', 'API o base no saludable'
    assert health.get('ml_mode') == 'model', f"Modo ML inesperado: {health.get('ml_mode')}"

    auth = call(base, '/auth/login', 'POST', {'email': email, 'password': password})
    token = auth.get('access_token')
    assert token, 'La autenticación no devolvió token JWT'

    sections = call(base, '/course-sections', token=token)
    assert isinstance(sections, list) and any(s.get('id') == section for s in sections), 'Sección no autorizada o inexistente'
    enrolled = call(base, f'/course-sections/{section}/students', token=token)
    ids_enrolled = {student_row['id'] for student_row in enrolled}
    assert student in ids_enrolled, 'El alumno de prueba no está matriculado en la sección'

    pred = call(base, '/ml/predict', 'POST', {'student_id': student, 'course_section_id': section}, token)
    assert pred.get('model_version') == 'demo-v1', 'La predicción usa el fallback mock-v0 o un modelo distinto'
    assert pred.get('synthetic_data') is True, 'La API no marcó datos sintéticos'
    assert pred.get('risk_level') in {'alto', 'moderado', 'bajo'}, 'Riesgo fuera del contrato'
    grade = pred.get('predicted_final_grade')
    assert isinstance(grade, (int, float)) and 0 <= grade <= 20, 'Nota predicha inválida'

    out = call(base, '/ml/groups', 'POST', {'course_section_id': section, 'n_groups': n_groups}, token)
    assert out.get('model_version') == 'demo-v1', 'Agrupamiento no usa el módulo real'
    groups = out.get('groups')
    assert isinstance(groups, list) and len(groups) == n_groups, 'Cantidad de grupos incorrecta'
    grouped = [str(s) for group in groups for s in group['student_ids']]
    assert len(grouped) == len(set(grouped)), 'Hay estudiantes duplicados entre grupos'
    assert set(grouped) == ids_enrolled, 'Faltan estudiantes o hay identificadores ajenos a la sección'
    sizes = [len(group['student_ids']) for group in groups]
    assert max(sizes) - min(sizes) <= 1, 'Grupos desequilibrados'
    return {
        'date_utc': datetime.now(timezone.utc).isoformat(),
        'environment': base.rstrip('/'),
        'checks': {'health': 'PASS', 'login': 'PASS', 'authorization': 'PASS', 'prediction': 'PASS', 'group_integrity': 'PASS'},
        'ml_mode': health['ml_mode'],
        'model_version': pred['model_version'],
        'synthetic_data': True,
        'section_id': section,
        'demo_student_id': student,
        'predicted_final_grade': grade,
        'risk_level': pred['risk_level'],
        'group_sizes': sizes,
        'total_students': len(ids_enrolled)
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Verificar integración ML del proyecto académico')
    parser.add_argument('--base-url', default='http://localhost:8000')
    parser.add_argument('--section', default='CS-2026-001')
    parser.add_argument('--student', default='STU-001')
    parser.add_argument('--n-groups', type=int, default=4)
    parser.add_argument('--output', default='Informe/evidencias/verificacion_ml_samuel.json')
    args = parser.parse_args()
    email = os.getenv('APF3_EMAIL')
    password = os.getenv('APF3_PASSWORD')
    if not email or not password:
        parser.error('Define APF3_EMAIL y APF3_PASSWORD en la terminal; no guardes credenciales en Git')
    result = validate(args.base_url, email, password, args.student, args.section, args.n_groups)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('ML verificado correctamente: modelo real, nota, riesgo y grupos sin duplicados.')
    print('Evidencia:', out)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
