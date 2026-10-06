"""
Training script for GarbageAnalysis.

Uses MobileNetV2 with transfer learning to classify garbage images.
Dataset should be organized as:
    data/
    ├── cardboard/
    ├── glass/
    ├── metal/
    ├── organic/
    ├── paper/
    └── plastic/
"""

import os
import tensorflow as tf
from tensorflow import keras
from config import DATASET_DIR, MODEL_DIR, MODEL_PATH, IMG_SIZE, BATCH_SIZE, EPOCHS, LEARNING_RATE, CLASS_NAMES


def build_model(num_classes: int) -> keras.Model:
    """Build a MobileNetV2-based classifier with transfer learning."""

    # Load MobileNetV2 pre-trained on ImageNet, without top classification layer
    base_model = keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )

    # Freeze the base model (we only train the new top layers)
    base_model.trainable = False

    # Build the full model
    model = keras.Sequential([
        base_model,
        keras.layers.GlobalAveragePooling2D(),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(128, activation="relu"),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(num_classes, activation="softmax"),
    ])

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model


def load_dataset():
    """Load training and validation datasets from the data/ directory."""

    train_ds = keras.utils.image_dataset_from_directory(
        DATASET_DIR,
        validation_split=0.2,
        subset="training",
        seed=42,
        image_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        label_mode="int",
    )

    val_ds = keras.utils.image_dataset_from_directory(
        DATASET_DIR,
        validation_split=0.2,
        subset="validation",
        seed=42,
        image_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        label_mode="int",
    )

    # Normalize pixel values to [0, 1]
    normalize = keras.layers.Rescaling(1.0 / 255)
    train_ds = train_ds.map(lambda x, y: (normalize(x), y))
    val_ds = val_ds.map(lambda x, y: (normalize(x), y))

    # Prefetch for performance
    train_ds = train_ds.prefetch(tf.data.AUTOTUNE)
    val_ds = val_ds.prefetch(tf.data.AUTOTUNE)

    return train_ds, val_ds


def main():
    print("Loading dataset...")
    train_ds, val_ds = load_dataset()

    print("Building model...")
    model = build_model(num_classes=len(CLASS_NAMES))
    model.summary()

    print(f"Training for {EPOCHS} epochs...")
    history = model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS)

    # Save the trained model
    os.makedirs(MODEL_DIR, exist_ok=True)
    model.save(MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

    # Print final metrics
    val_acc = history.history["val_accuracy"][-1]
    print(f"Final validation accuracy: {val_acc:.4f}")


if __name__ == "__main__":
    main()
