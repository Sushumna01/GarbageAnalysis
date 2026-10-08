"""
FastAPI prediction server for the trained GarbageAnalysis classifier.

Run from the ml directory with:
    python -m uvicorn app:app --reload --port 8000
"""

import io
import json
import logging
import os

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from config import CLASS_NAMES_PATH, IMG_SIZE, MODEL_PATH

try:
    import tensorflow as tf
except ImportError:
    tf = None

logger = logging.getLogger(__name__)
app = FastAPI(
    title="GarbageAnalysis ML API",
    description="Upload a garbage image and get its classification",
    version="1.0.0",
)

model = None
class_names = []


@app.on_event("startup")
def load_model():
    global model, class_names

    if tf is None:
        logger.error(
            "TensorFlow is not installed. Install ml/requirements.txt before training/loading the classifier."
        )
        return

    if not os.path.isfile(MODEL_PATH) or not os.path.isfile(CLASS_NAMES_PATH):
        logger.error(
            "Trained model or class labels are missing. Run train.py after preparing ml/data."
        )
        return

    try:
        with open(CLASS_NAMES_PATH, encoding="utf-8") as class_file:
            loaded_class_names = json.load(class_file)
        loaded_model = tf.keras.models.load_model(MODEL_PATH)

        if not isinstance(loaded_class_names, list) or len(loaded_class_names) != loaded_model.output_shape[-1]:
            raise ValueError("Saved class labels do not match the model output layer.")

        class_names = loaded_class_names
        model = loaded_model
        logger.info("Loaded trained waste classifier with %d classes.", len(class_names))
    except Exception:
        logger.exception("Could not load the trained waste classifier.")
        model = None
        class_names = []


@app.get("/")
def root():
    return {
        "message": "GarbageAnalysis ML API is running",
        "model_loaded": model is not None,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Classify an uploaded image with the saved trained model."""
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Trained model is unavailable. Run the training script first.",
        )

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image = image.resize((IMG_SIZE, IMG_SIZE))
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(status_code=400, detail="Invalid image file") from error

    image_array = np.expand_dims(np.asarray(image, dtype=np.float32), axis=0)
    probabilities = model.predict(image_array, verbose=0)[0]
    ranked_indices = np.argsort(probabilities)[::-1][:3]
    class_index = int(ranked_indices[0])

    predictions = [
        {
            "category": class_names[int(index)],
            "class": class_names[int(index)],
            "confidence": round(float(probabilities[index]), 4),
        }
        for index in ranked_indices
    ]
    category = class_names[class_index]
    confidence = float(probabilities[class_index])

    return {
        "category": category,
        "class": category,
        "confidence": round(confidence, 4),
        "predictions": predictions,
    }
