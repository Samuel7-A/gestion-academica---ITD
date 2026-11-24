#!/usr/bin/env python3
"""Benchmark secuencial, no destructivo, de endpoints del proyecto (solo datos sintéticos).

No envía notas ni modifica la BD. No imprime contraseñas ni tokens.
NUNCA presentar los resultados como métricas de producción si se ejecuta contra localhost.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def request(base: str, path: str, method='GET', payload=None, token='', timeout=15):
    data = json.dumps(payload).encode('utf-8') if payload is not None else None
    headers = {'Accept': 'application/json'}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = Request(base.rstrip('/') + '/api/v1' + path, data=data, headers=headers, method=method)
    start = time.perf_counter()
    try:
        with urlopen(req, timeout=timeout) as response:
            response.read()
            return response.status, (time.perf_counter() - start) * 1000
    except HTTPError as err:
        return err.code, (time.perf_counter() - start) * 1000
    except (URLError, TimeoutError):
        return 0, (time.perf_counter() - start) * 1000


def get_token(base, email, password):
    data = json.dumps({'email': email, 'password': password}).encode('utf-8')
    req = Request(base.rstrip('/') + '/api/v1/auth/login', data=data,
                  headers={'Content-Type': 'application/json'}, method='POST')
    with urlopen(req, timeout=20) as response:
        obj = json.load(response)
    token = obj.get('access_token')
    if not token:
        raise RuntimeError('No se obtuvo el token del docente')
    return token


def summarize(records):
    times = sorted(t for status, t in records if 200 <= status < 300)
    success = len(times)
    return {
        'requests': len(records), 'successes': success, 'errors': len(records) - success,
        'median_ms': round(statistics.median(times), 2) if times else None,
        'p95_ms': round(times[max(0, math.ceil(0.95 * success) - 1)], 2) if times else None,
        'min_ms': round(min(times), 2) if times else None,
        'max_ms': round(max(times), 2) if times else None,
        'status_codes': {str(code): sum(1 for status, _ in records if status == code) for code in sorted({s for s, _ in records})}
    }


def main():
    parser = argparse.ArgumentParser(description='Medir tiempos de respuesta FastAPI (sin escritura)')
    parser.add_argument('--base-url', default='http://localhost:8000')
    parser.add_argument('--count', type=int, default=30)
    parser.add_argument('--mode', choices=['health', 'all'], default='all')
    parser.add_argument('--student', default='STU-001')
    parser.add_argument('--section', default='CS-2026-001')
    parser.add_argument('--pause', type=float, default=0.05)
    parser.add_argument('--output', default='Informe/evidencias/latencia_api_samuel.json')
    args = parser.parse_args()
    if not (1 <= args.count <= 100) or not (0 <= args.pause <= 2):
        parser.error('count debe estar entre 1 y 100; pause entre 0 y 2 segundos')

    token = ''
    if args.mode == 'all':
        email, password = os.getenv('APF3_EMAIL'), os.getenv('APF3_PASSWORD')
        if not email or not password:
            parser.error('Define APF3_EMAIL y APF3_PASSWORD para medir rutas autenticadas')
        token = get_token(args.base_url, email, password)

    cases = [('/health', 'GET', None)]
    if args.mode == 'all':
        cases += [('/course-sections', 'GET', None),
                  ('/ml/predict', 'POST', {'student_id': args.student, 'course_section_id': args.section})]
    report = {'date_utc': datetime.now(timezone.utc).isoformat(),
              'environment': args.base_url.rstrip('/'), 'type': 'sequential_not_load_test',
              'count_per_endpoint': args.count, 'pause_seconds': args.pause,
              'dataset': 'synthetic_demo', 'results': {}}
    for path, method, body in cases:
        # Una petición de calentamiento para evitar mezclar arranque inicial y tráfico estable.
        request(args.base_url, path, method, body, token)
        records = []
        for _ in range(args.count):
            records.append(request(args.base_url, path, method, body, token))
            if args.pause:
                time.sleep(args.pause)
        report['results'][path] = summarize(records)
        print(path, report['results'][path])
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('Reporte guardado en', path)
    if any(data['errors'] for data in report['results'].values()):
        raise SystemExit('Hubo solicitudes fallidas: consulta los estados del reporte JSON')


if __name__ == '__main__':
    main()
