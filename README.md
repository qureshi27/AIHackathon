# AI Hackathon 2026 — ASL Sign Language Classification

Forman Computer Science Club · Forman Christian College.

A two-track American Sign Language alphabet classifier for the 29-class Kaggle
problem (A–Z, `space`, `del`, `nothing`), plus a deployable browser demo.

## Repository layout

```
AI Hackathon/
├── notebooks/
│   ├── 01_cnn_efficientnet.ipynb     # Track 1 — EfficientNetV2-S, max Kaggle score
│   └── 02_mediapipe_landmarks.ipynb  # Track 2 — landmark-based, robust to webcam
├── scripts/
│   └── download_data.py              # Kaggle dataset puller
├── src/
│   └── dataset.py                    # PyTorch Dataset + dataloaders
├── Code/
│   ├── web/                          # Vite + React + TS browser demo (deploy this)
│   ├── design.md                     # Design tokens used by web/
│   ├── best_landmark_transformer_v2.pt.zip
│   ├── mediapipe_landmarks_cache_v2.npz.zip
│   └── hand_landmarker (1).task      # MediaPipe Hands model
├── Hackathon_Guide.pdf
└── requirements.txt
```

The 82 MB `best_effnet_v2s.pt.zip` is intentionally `.gitignore`d — it lives
on Kaggle and can be regenerated from `notebooks/01_cnn_efficientnet.ipynb`.

## Two-track approach

| Track | Model | Where it runs | Optimised for |
|---|---|---|---|
| 1 | EfficientNetV2-S | Kaggle (GPU) | Leaderboard accuracy (25%) |
| 2 | Landmark Transformer (192-d, 6 layers, 2.9M params) | Browser via ONNX Runtime Web | Live demo robustness (25%) |

The CNN trained on Kaggle's clean uniform-background images degrades on real
webcams. The landmark Transformer, fed MediaPipe's 21 hand keypoints, is
invariant to background, lighting, and skin tone — so it handles webcam input
gracefully and ships as an 11 MB ONNX file.

## Live demo (Phase 2)

The web app at [`Code/web/`](Code/web) is a static SPA — MediaPipe + ONNX run
fully in the browser. See [`Code/web/README.md`](Code/web/README.md) for run
and deploy instructions.

Quick start:

```bash
cd Code/web
npm install
npm run dev
```

## Deploy to Vercel

This repo deploys directly to Vercel with **Root Directory = `Code/web`**:

1. Push the repo to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. **Root Directory:** `Code/web`. Framework auto-detected as Vite.
4. **Deploy.** `Code/web/vercel.json` handles SPA rewrites, MIME types for
   `.onnx`/`.task`/`.wasm`, and immutable caching.

## Training data

Run `python scripts/download_data.py` after dropping a Kaggle API token into
`~/.kaggle/kaggle.json`. Dataset: `grassknoted/asl-alphabet`, 87,000 images
across 29 classes.
