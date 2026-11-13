"""Predicciones académicas sintéticas para la demostración APF3.

API que consume Backend/app/services/ml_service.py.
"""
from .inference import predict_final_grade, predict_risk, generate_groups

__all__ = ["predict_final_grade", "predict_risk", "generate_groups"]
