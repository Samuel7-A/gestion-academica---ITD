# Aporte de Samuel: Machine Learning, estadísticas y rendimiento

**Proyecto:** Plataforma inteligente integrada para la gestión académica docente — I.E. Juventud Científica
**Propósito:** aportar pruebas técnicas y métricas verificables para el Proyecto Final.
**Fuente de datos:** **100 % sintética**. No hay validación con registros reales de estudiantes.

## 1. Modelos ML integrados

Se implementaron tres funciones públicas bajo `Backend/ml/inference.py`:

| Función | Algoritmo | Salida |
|---|---|---|
| Predicción de nota | Regresión lineal | Calificación proyectada de 0 a 20 |
| Riesgo académico | Árbol de decisión | Alto / moderado / bajo (etiquetas ficticias de la demo) |
| Formación de grupos | K-Means + balanceo posterior | Listas de identificadores sin duplicación y grupos equilibrados |

La API FastAPI de César consume estas funciones a través de `POST /api/v1/ml/predict` y `POST /api/v1/ml/groups`.

## 2. Datos y prevención de fuga

- Entrenamiento: 240 registros históricos sintéticos de 2023 y 2024.
- Evaluación temporal: 120 registros de 2025 no usados para entrenar.
- Demostración parcial: 80 registros sintéticos de 2026 sin nota final real ni etiqueta de riesgo.
- Entradas: notas bimestrales 1 y 2, asistencia, cumplimiento de tareas, participación y promedio anterior.
- El código de entrenamiento utiliza un `Pipeline`; el escalado y la imputación se ajustan solo con los datos de entrenamiento.

## 3. Métricas verificadas del artefacto

**Fuente reproducible:** `Backend/ml/artifacts/metrics.json`, generado por `python -m ml.train`.

| Algoritmo | Métrica | Valor | Interpretación |
|---|---|---:|---|
| Regresión | MAE | 0.6571 | Error absoluto medio de aproximadamente 0.66 puntos en escala 0–20 |
| Regresión | RMSE | 0.8114 | Penaliza más los errores grandes |
| Árbol de decisión | Accuracy | 0.8583 | Acertó 103 de 120 clasificaciones sintéticas |
| Árbol de decisión | F1 macro | 0.8384 | Promedio equilibrado del desempeño de las tres clases |

La matriz de confusión está guardada en `Informe/evidencias/matriz_confusion_ml_samuel.png` y se puede reproducir a partir de `metrics.json`.

### Matriz de confusión, filas = etiqueta verdadera; columnas = predicha

| Real / Predicho | Alto | Moderado | Bajo |
|---|---:|---:|---:|
| Alto | 37 | 7 | 0 |
| Moderado | 1 | 20 | 7 |
| Bajo | 0 | 2 | 46 |

**Limitaciones:** ningún resultado demuestra capacidad predictiva real en la institución. El comportamiento del modelo depende de cómo se generó el conjunto sintético. La asignación de grupos no ha sido validada pedagógicamente.

## 4. Estadísticas del frontend — corrección para la entrega final

El módulo `grades-performance` de `App-Angular` ahora debe calcular **únicamente** a partir de `GET /api/v1/course-sections/{id}/gradebook`:

- Promedio por actividad: media aritmética de calificaciones **registradas** (incluye cero).
- Cobertura por actividad: estudiantes con calificación sobre estudiantes matriculados.
- Promedio por bimestre: media de promedios bimestrales de estudiantes que tienen una nota válida.
- Promedio general: media de `current_average` de estudiantes con datos. **No es ponderado:** el API no expone pesos.
- Última actualización: fecha de modificación de una calificación, **no** fecha de examen.
- Valores ausentes: `—` o «Sin notas»; nunca sustituidos por cero o fechas ficticias.

**Aclaración:** «estudiantes con calificaciones» no equivale a porcentaje de aprobados. El número mostrado en la barra es el porcentaje de **20 puntos**, no un KPI oficial institucional.

## 5. Validaciones para ejecutar en el equipo (evidencias, no resultados inventados)

### Prueba de modelos local

```powershell
cd Backend
python -m pip install -r requirements-dev.txt -r ml/requirements.txt
python -m pytest ml/tests -q
cd ..
```

### Prueba de integración ML desde FastAPI

Con Docker Compose encendido y datos de demostración:

```powershell
$env:APF3_EMAIL = 'docente1@demo.edu.pe'
$env:APF3_PASSWORD = 'Docente123!'
python scripts/verificar_ml_integracion.py --base-url http://localhost:8000
```

**Debe verificar:** salud de API, `ml_mode=model`, `model_version=demo-v1`, nota en 0–20, riesgo válido, asignación de cada estudiante una única vez y diferencia máxima de un integrante por grupo. Guardar el JSON generado en `Informe/evidencias/`.

### Latencia secuencial de FastAPI

```powershell
python scripts/medir_api_samuel.py --base-url http://localhost:8000 --mode all --count 30
```

Mide 30 solicitudes por endpoint (además de una llamada de calentamiento), de manera secuencial y no destructiva. Informa **mediana, p95, mínimo, máximo y número de errores** por cada ruta. Repetir contra la URL pública cuando César la comparta, sin utilizar datos institucionales reales. Los resultados son específicos del entorno y no deben presentarse como datos institucionales de rendimiento.

### Plantilla de resultados: completar después de ejecutar

| Entorno y fecha | Endpoint | Solicitudes | Mediana (ms) | p95 (ms) | Errores |
|---|---|---:|---:|---:|---:|
| **Pendiente de medición** | `/health` | — | — | — | — |
| **Pendiente de medición** | `/course-sections` | — | — | — | — |
| **Pendiente de medición** | `/ml/predict` | — | — | — | — |

## 6. Contribución y colaboración

El modelo se encuentra integrado en `main`, mientras que el frontend actualizado vive en `App-Angular`. Las correcciones de estadísticas se deben proponer por PR hacia la rama de integración del Proyecto Final, o temporalmente hacia `App-Angular` si aún no existe esa rama.

**No incluir en GitHub** contraseñas privadas, tokens JWT, `.env`, URL con contraseña de Supabase ni capturas que muestren secretos.
