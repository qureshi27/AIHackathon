"""Download the ASL Alphabet dataset from Kaggle and unzip it into ./data/raw.

Requires Kaggle API credentials at ~/.kaggle/kaggle.json (or %USERPROFILE%\\.kaggle\\kaggle.json on Windows).
Create one at https://www.kaggle.com/settings -> Account -> Create New API Token.
"""
from __future__ import annotations

import os
import sys
import zipfile
from pathlib import Path

DATASET = "grassknoted/asl-alphabet"
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    train_root = RAW_DIR / "asl_alphabet_train"
    if train_root.exists() and any(train_root.iterdir()):
        print(f"Dataset already present at {train_root}. Skipping download.")
        return

    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
    except ImportError:
        sys.exit("kaggle package not installed. Run: pip install -r requirements.txt")

    api = KaggleApi()
    api.authenticate()

    print(f"Downloading {DATASET} to {RAW_DIR} ...")
    api.dataset_download_files(DATASET, path=str(RAW_DIR), quiet=False)

    zip_path = RAW_DIR / "asl-alphabet.zip"
    if not zip_path.exists():
        candidates = list(RAW_DIR.glob("*.zip"))
        if not candidates:
            sys.exit("Download finished but no zip file found.")
        zip_path = candidates[0]

    print(f"Unzipping {zip_path.name} ...")
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(RAW_DIR)
    zip_path.unlink()

    print(f"Done. Train images: {sum(1 for _ in (RAW_DIR / 'asl_alphabet_train' / 'asl_alphabet_train').rglob('*.jpg'))}")


if __name__ == "__main__":
    main()
