"""
Configuration for GarbageAnalysis ML module.
All paths, hyperparameters, and class labels in one place.
"""

import os

# ── Paths ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "saved_model")
MODEL_PATH = os.path.join(MODEL_DIR, "garbage_classifier.h5")

# ── Image settings ──
IMG_SIZE = 224          # MobileNetV2 expects 224x224
BATCH_SIZE = 32

# ── Training settings ──
EPOCHS = 10
LEARNING_RATE = 0.001

# ── Class labels (matches dataset folder names) ──
CLASS_NAMES = [
    "cardboard",
    "glass",
    "metal",
    "organic",
    "paper",
    "plastic",
]
