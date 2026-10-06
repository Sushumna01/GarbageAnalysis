# ML Module — GarbageAnalysis

Image classification model that categorizes garbage into **6 classes**: cardboard, glass, metal, organic, paper, plastic.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Train (requires dataset in data/ folder)
python train.py

# Predict a single image
python predict.py --image path/to/image.jpg

# Start FastAPI server (optional)
uvicorn app:app --reload --port 8000
```

## Dataset Setup

Download a garbage classification dataset (e.g., [TrashNet](https://github.com/garythung/trashnet)) and organize it as:

```
ml/data/
├── cardboard/
├── glass/
├── metal/
├── organic/
├── paper/
└── plastic/
```

## Architecture

- **Base model:** MobileNetV2 (pre-trained on ImageNet, frozen)
- **Top layers:** GlobalAveragePooling → Dropout → Dense(128) → Dropout → Softmax(6)
- **Training:** Transfer learning — only top layers are trained
