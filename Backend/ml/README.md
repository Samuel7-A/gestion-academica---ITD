# Módulo ML — Samuel Torres · APF3

Módulo **demostrativo**: datos 100 % sintéticos. No es un sistema clínico, pedagógico ni de promoción escolar validado. Los umbrales de riesgo (`alto`: <11, `moderado`: 11 a <14, `bajo`: >=14) son etiquetas ficticias del prototipo, no criterios de la institución.

## Funciones integradas

`ml.inference` exporta exactamente las funciones requeridas por el backend de César:

```python
predict_risk(features)  # 'alto' | 'moderado' | 'bajo'
predict_final_grade(features)  # float, 0..20
generate_groups(students, n_groups)  # list[list[str]]
```

`features` incluye **exactamente**: `grade_bimester_1`, `grade_bimester_2`, `attendance_pct`, `homework_pct`, `participation_pct`, `previous_average`.

`students` es una lista de diccionarios con `student_id` y esas mismas seis variables.

## Uso en el repositorio

1. Copiar esta carpeta `ml/` dentro de la carpeta **`Backend/`** del repositorio.
2. Desde `Backend/` instalar: `python -m pip install -r ml/requirements.txt`.
3. Generar modelos y datos: `python -m ml.train` (incluye 360 registros 2023–25 y 80 parciales 2026).
4. Comprobar: `python -m pytest ml/tests -q`.
5. Ejecutar FastAPI normalmente. `ml/__init__.py` hace que el adaptador del backend detecte los modelos **sin modificar `app/`**.
6. En Swagger probar `POST /api/v1/ml/predict`, `POST /api/v1/ml/groups` y `GET /api/v1/health`. Cuando se hayan cargado los modelos, `ml_mode` debería ser `model` y `model_version` debería ser `demo-v1` (no `mock-v0`).

Se incluyen los artefactos `.joblib` preentrenados para una demostración inmediata; **cárgalos únicamente si proceden de este paquete verificado**. Si cambian las versiones de scikit-learn o la generación de datos, vuelve a ejecutar `python -m ml.train` en el entorno de ejecución.

## Evaluación y limitaciones

- Entrenamiento: años 2023–2024; prueba temporal reservada: 2025.
- 2026 carece de `final_grade` (no se inventan resultados reales).
- Regresión: error absoluto medio (MAE), raíz del error cuadrático medio (RMSE).
- Clasificación: exactitud, F1 macro, matriz de confusión.
- K-Means identifica perfiles y se aplica una distribución posterior para equilibrar tamaños; no es una garantía de calidad pedagógica.
- Los modelos no deben usarse con datos reales sin consentimiento, revisión de sesgos y validación externa.
- El seed de César (`app/db/seed.py`) es independiente y **ya sirve para la interfaz**; los CSV de este módulo son **solo entrenamiento/evaluación**. No sobrescribir Supabase ni ejecutar `--reset` en una base compartida.
