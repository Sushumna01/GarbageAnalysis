"""
Configuration for GarbageAnalysis ML module.
All paths, hyperparameters, and class labels in one place.
"""

import os

# ── Paths ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "saved_model")
MODEL_PATH = os.path.join(MODEL_DIR, "garbage_classifier.keras")
CLASS_NAMES_PATH = os.path.join(MODEL_DIR, "class_names.json")
METRICS_PATH = os.path.join(MODEL_DIR, "evaluation.json")

# ── Image settings ──
IMG_SIZE = 160
BATCH_SIZE = 32

# ── Training settings ──
EPOCHS = 8
LEARNING_RATE = 0.0005
RANDOM_SEED = 42

# ── Canonical output labels and source folder aliases ──
REQUIRED_CLASS_NAMES = [
    "cardboard",
    "glass",
    "metal",
    "organic",
    "paper",
    "plastic",
]

OPTIONAL_CLASS_NAMES = ["battery", "clothes", "shoes", "trash"]
CLASS_NAMES = sorted(REQUIRED_CLASS_NAMES + OPTIONAL_CLASS_NAMES)


def canonicalize_source_label(label: str) -> str | None:
    """Map source dataset folder names to labels understood by the application."""
    normalized = label.strip().lower().replace("_", "-").replace(" ", "-")
    if "glass" in normalized:
        return "glass"
    if normalized in {"biological", "bio", "organic", "organic-waste"}:
        return "organic"
    if normalized in CLASS_NAMES:
        return normalized
    return None
