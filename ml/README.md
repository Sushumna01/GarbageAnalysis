# GarbageAnalysis ML service

This module trains and serves a MobileNetV2 transfer-learning classifier. It
expects a trained model for predictions; it does not invent classifications
when the model is missing.

## Dataset

The training workflow uses the public
[Garbage Classification with 12 classes dataset](https://huggingface.co/datasets/UdaraChamidu/Garbage-Classification-with-12-classes)
hosted on Hugging Face. Its archive is approximately 251 MB. The uploader's
dataset page does not declare a license, so check the upstream dataset terms
before redistributing the archive or trained weights.

Class folders are mapped to application labels as follows:

- `biological` becomes `organic`.
- Glass subfolders containing `glass` (for example, brown/green/white glass)
  are combined as `glass`.
- `cardboard`, `metal`, `paper`, and `plastic` retain their names.
- `battery`, `clothes`, `shoes`, and `trash` are retained as additional classes
  when present.
- Unrecognized source folders are skipped.

The training script requires all six primary material classes. It uses
deterministic, stratified 70%/15%/15% training, validation, and test splits.

## Setup and train (Windows)

Use Python 3.13 for the TensorFlow Windows wheel:

```powershell
cd ml
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

New-Item -ItemType Directory -Force data | Out-Null
curl.exe -L --fail --retry 8 --retry-all-errors -C - `
  -o data\garbage_classification.zip `
  https://huggingface.co/datasets/UdaraChamidu/Garbage-Classification-with-12-classes/resolve/main/garbage_classification.zip
Expand-Archive -LiteralPath data\garbage_classification.zip -DestinationPath data\source -Force

.\.venv\Scripts\python.exe train.py
```

The command trains MobileNetV2 with an ImageNet initialization and a compact
classification head. It saves `saved_model/garbage_classifier.keras`,
`saved_model/class_names.json`, and held-out test metrics in
`saved_model/evaluation.json`. The metrics include test accuracy, loss, a
confusion matrix, and per-class precision, recall, F1, and support. These files
are generated locally and are excluded from version control.

## Predict and run the API

```powershell
.\.venv\Scripts\python.exe predict.py --image path\to\image.jpg
.\.venv\Scripts\python.exe -m uvicorn app:app --reload --port 8000
```

`POST /predict` accepts a multipart image field named `file` and returns the
predicted category, confidence, and top-three predictions. The API returns HTTP
503 until a trained model and its matching class-label file are available.
