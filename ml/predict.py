"""
Single-image prediction utility for GarbageAnalysis.

Usage:
    python predict.py --image path/to/image.jpg
"""

import argparse
import tensorflow as tf
from utils.preprocess import load_and_preprocess
from config import MODEL_PATH, CLASS_NAMES


def predict(image_path: str):
    """Load the saved model and predict the class of a single image."""

    # Load model
    model = tf.keras.models.load_model(MODEL_PATH)

    # Preprocess image
    img_array = load_and_preprocess(image_path)

    # Predict
    predictions = model.predict(img_array)
    class_index = predictions[0].argmax()
    confidence = predictions[0][class_index]

    print(f"Predicted class : {CLASS_NAMES[class_index]}")
    print(f"Confidence      : {confidence:.2%}")

    return CLASS_NAMES[class_index], float(confidence)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Classify a garbage image")
    parser.add_argument("--image", type=str, required=True, help="Path to the image")
    args = parser.parse_args()

    predict(args.image)
