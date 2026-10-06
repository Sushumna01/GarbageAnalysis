"""
FastAPI prediction server for GarbageAnalysis.

Run:
    uvicorn app:app --reload --port 8000
"""

import io
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException
import tensorflow as tf

from config import MODEL_PATH, CLASS_NAMES, IMG_SIZE

app = FastAPI(
    title="GarbageAnalysis ML API",
    description="Upload a garbage image and get its classification",
    version="1.0.0",
)

# Load model once at startup
model = None


@app.on_event("startup")
def load_model():
    global model
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
        print("Model loaded successfully")
    except Exception as e:
        print(f"Warning: Could not load model — {e}")
        print("The /predict endpoint will not work until a model is trained.")


@app.get("/")
def root():
    return {"message": "GarbageAnalysis ML API is running"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Accept an image upload and return the predicted garbage class."""

    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Train the model first.")

    # Read and preprocess image
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        img = img.resize((IMG_SIZE, IMG_SIZE))
        img_array = np.array(img, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Predict
    predictions = model.predict(img_array)
    class_index = int(predictions[0].argmax())
    confidence = float(predictions[0][class_index])

    return {
        "class": CLASS_NAMES[class_index],
        "confidence": round(confidence, 4),
    }
