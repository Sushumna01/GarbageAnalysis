"""
Image preprocessing utilities for GarbageAnalysis.
"""

import numpy as np
from PIL import Image
from config import IMG_SIZE


def load_and_preprocess(image_path: str) -> np.ndarray:
    """
    Load an image from disk, resize it, and normalize pixel values to [0, 1].

    Args:
        image_path: Path to the image file.

    Returns:
        Numpy array of shape (1, IMG_SIZE, IMG_SIZE, 3) ready for model input.
    """
    img = Image.open(image_path).convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)  # Add batch dimension
