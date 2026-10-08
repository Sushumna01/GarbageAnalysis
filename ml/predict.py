"""
Predict the waste category for one image using the trained model.

Usage:
    python predict.py --image path/to/image.jpg
"""

import argparse
import json

import numpy as np
import tensorflow as tf
from PIL import Image

from config import CLASS_NAMES_PATH, IMG_SIZE, MODEL_PATH


def predict(image_path: str):
    """Load the trained model and predict a single image."""
    with open(CLASS_NAMES_PATH, encoding="utf-8") as class_file:
        class_names = json.load(class_file)
    model = tf.keras.models.load_model(MODEL_PATH)

    image = Image.open(image_path).convert("RGB").resize((IMG_SIZE, IMG_SIZE))
    image_array = np.expand_dims(np.asarray(image, dtype=np.float32), axis=0)
    probabilities = model.predict(image_array, verbose=0)[0]
    ranked_indices = np.argsort(probabilities)[::-1][:3]
    predicted_class = class_names[int(ranked_indices[0])]
    confidence = float(probabilities[ranked_indices[0]])

    print(f"Predicted class : {predicted_class}")
    print(f"Confidence      : {confidence:.2%}")
    for index in ranked_indices:
        print(f"  {class_names[int(index)]}: {probabilities[index]:.2%}")

    return predicted_class, confidence


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Classify a garbage image")
    parser.add_argument("--image", type=str, required=True, help="Path to the image")
    args = parser.parse_args()

    predict(args.image)
