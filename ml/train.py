"""
Train and evaluate the GarbageAnalysis MobileNetV2 waste classifier.

Place the extracted dataset under data/. Source class folders are mapped to
canonical application labels, including biological -> organic and glass variants
-> glass. The script uses stratified 70/15/15 train/validation/test splits.
"""

import json
import os
from collections import defaultdict
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow import keras

from config import (
    BATCH_SIZE,
    CLASS_NAMES,
    CLASS_NAMES_PATH,
    DATASET_DIR,
    EPOCHS,
    IMG_SIZE,
    LEARNING_RATE,
    METRICS_PATH,
    MODEL_DIR,
    MODEL_PATH,
    RANDOM_SEED,
    REQUIRED_CLASS_NAMES,
    canonicalize_source_label,
)

IMAGE_EXTENSIONS = {".bmp", ".gif", ".jpeg", ".jpg", ".png", ".webp"}


def collect_images():
    """Collect image paths, mapping source directory names to canonical labels."""
    if not os.path.isdir(DATASET_DIR):
        raise FileNotFoundError(
            f"Dataset folder not found: {DATASET_DIR}. Download and extract the dataset first."
        )

    images_by_class = defaultdict(list)
    for path in Path(DATASET_DIR).rglob("*"):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        source_label = None
        for part in reversed(path.parts):
            source_label = canonicalize_source_label(part)
            if source_label:
                break
        if source_label:
            images_by_class[source_label].append(str(path))

    missing = sorted(set(REQUIRED_CLASS_NAMES) - images_by_class.keys())
    if missing:
        found = ", ".join(
            f"{label}: {len(paths)}" for label, paths in sorted(images_by_class.items())
        ) or "none"
        raise ValueError(
            f"Dataset is missing required classes: {', '.join(missing)}. "
            f"Recognized classes and image counts: {found}"
        )

    class_names = [name for name in CLASS_NAMES if images_by_class.get(name)]
    return images_by_class, class_names


def split_dataset(images_by_class, class_names):
    """Create deterministic, class-stratified training, validation, and test sets."""
    rng = np.random.default_rng(RANDOM_SEED)
    split_items = {"train": ([], []), "validation": ([], []), "test": ([], [])}

    for class_index, class_name in enumerate(class_names):
        paths = np.asarray(images_by_class[class_name], dtype=str)
        if len(paths) < 3:
            raise ValueError(
                f"Class '{class_name}' needs at least 3 images for train/validation/test; "
                f"found {len(paths)}."
            )

        rng.shuffle(paths)
        train_count = max(1, int(len(paths) * 0.70))
        validation_count = max(1, int(len(paths) * 0.15))
        if train_count + validation_count >= len(paths):
            train_count = len(paths) - 2
            validation_count = 1
        train_end = train_count
        validation_end = train_count + validation_count
        partitions = {
            "train": paths[:train_end],
            "validation": paths[train_end:validation_end],
            "test": paths[validation_end:],
        }
        for split_name, split_paths in partitions.items():
            split_items[split_name][0].extend(split_paths.tolist())
            split_items[split_name][1].extend([class_index] * len(split_paths))

    datasets = {}
    split_counts = {}
    for split_name, (paths, labels) in split_items.items():
        split_counts[split_name] = len(paths)
        dataset = tf.data.Dataset.from_tensor_slices((paths, labels))
        dataset = dataset.map(decode_image, num_parallel_calls=tf.data.AUTOTUNE)
        if split_name == "train":
            dataset = dataset.shuffle(
                min(len(paths), 2048), seed=RANDOM_SEED, reshuffle_each_iteration=True
            )
        datasets[split_name] = dataset.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)

    return datasets, split_counts


def decode_image(path, label):
    image = tf.io.read_file(path)
    image = tf.io.decode_image(image, channels=3, expand_animations=False)
    image.set_shape([None, None, 3])
    image = tf.image.resize(image, (IMG_SIZE, IMG_SIZE))
    return image, label


def build_model(num_classes: int) -> keras.Model:
    """Build a lightweight MobileNetV2 transfer-learning classifier."""
    base_model = keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    x = keras.layers.RandomFlip("horizontal")(inputs)
    x = keras.layers.RandomRotation(0.08)(x)
    x = keras.layers.Rescaling(1.0 / 127.5, offset=-1)(x)
    x = base_model(x, training=False)
    x = keras.layers.GlobalAveragePooling2D()(x)
    x = keras.layers.Dropout(0.3)(x)
    x = keras.layers.Dense(128, activation="relu")(x)
    x = keras.layers.Dropout(0.2)(x)
    outputs = keras.layers.Dense(num_classes, activation="softmax")(x)
    model = keras.Model(inputs, outputs)

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def evaluate_test_set(model, dataset, class_names):
    """Evaluate the untouched test split and build per-class metrics."""
    true_labels = np.concatenate([labels.numpy() for _, labels in dataset])
    probabilities = model.predict(dataset, verbose=0)
    predicted_labels = probabilities.argmax(axis=1)
    confusion = tf.math.confusion_matrix(
        true_labels, predicted_labels, num_classes=len(class_names)
    ).numpy()

    per_class = {}
    for index, class_name in enumerate(class_names):
        true_positive = int(confusion[index, index])
        false_positive = int(confusion[:, index].sum() - true_positive)
        false_negative = int(confusion[index, :].sum() - true_positive)
        precision = true_positive / max(true_positive + false_positive, 1)
        recall = true_positive / max(true_positive + false_negative, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-12)
        per_class[class_name] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": int(confusion[index, :].sum()),
        }

    return {
        "test_accuracy": round(float(np.mean(true_labels == predicted_labels)), 4),
        "test_loss": round(float(model.evaluate(dataset, verbose=0)[0]), 4),
        "class_names": class_names,
        "confusion_matrix": confusion.tolist(),
        "per_class": per_class,
    }


def main():
    tf.keras.utils.set_random_seed(RANDOM_SEED)
    images_by_class, class_names = collect_images()
    datasets, split_counts = split_dataset(images_by_class, class_names)

    print("Dataset class counts:")
    for class_name in class_names:
        print(f"  {class_name}: {len(images_by_class[class_name])}")
    for split_name, count in split_counts.items():
        print(f"{split_name.capitalize()} examples: {count}")

    model = build_model(num_classes=len(class_names))
    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=3, restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.3, patience=2, min_lr=1e-6
        ),
    ]
    model.fit(
        datasets["train"],
        validation_data=datasets["validation"],
        epochs=EPOCHS,
        callbacks=callbacks,
    )

    os.makedirs(MODEL_DIR, exist_ok=True)
    model.save(MODEL_PATH)
    with open(CLASS_NAMES_PATH, "w", encoding="utf-8") as class_file:
        json.dump(class_names, class_file, indent=2)

    metrics = evaluate_test_set(model, datasets["test"], class_names)
    metrics["dataset_counts"] = {
        class_name: len(images_by_class[class_name]) for class_name in class_names
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as metrics_file:
        json.dump(metrics, metrics_file, indent=2)

    print(f"Saved trained model: {MODEL_PATH}")
    print(f"Saved class labels: {CLASS_NAMES_PATH}")
    print(f"Saved held-out test metrics: {METRICS_PATH}")
    print(f"Test accuracy: {metrics['test_accuracy']:.4f}")
    for class_name, scores in metrics["per_class"].items():
        print(
            f"  {class_name}: precision={scores['precision']:.4f}, "
            f"recall={scores['recall']:.4f}, f1={scores['f1']:.4f}, "
            f"support={scores['support']}"
        )


if __name__ == "__main__":
    main()
