"""ASL Alphabet dataset and dataloaders.

Dataset layout after running scripts/download_data.py:
    data/raw/asl_alphabet_train/asl_alphabet_train/<CLASS>/*.jpg   (87,000 imgs, 29 classes)
    data/raw/asl_alphabet_test/asl_alphabet_test/<CLASS>_test.jpg  (29 imgs, public test)

Classes: A-Z plus 'space', 'del', 'nothing' -> 29 total.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
import torch
from PIL import Image
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Dataset

CLASSES: tuple[str, ...] = tuple(
    [chr(c) for c in range(ord("A"), ord("Z") + 1)] + ["space", "del", "nothing"]
)
CLASS_TO_IDX: dict[str, int] = {c: i for i, c in enumerate(CLASSES)}
IDX_TO_CLASS: dict[int, str] = {i: c for c, i in CLASS_TO_IDX.items()}

DEFAULT_ROOT = Path(__file__).resolve().parent.parent / "data" / "raw"


@dataclass
class Sample:
    path: Path
    label: int


def _scan_train(root: Path) -> list[Sample]:
    train_dir = root / "asl_alphabet_train" / "asl_alphabet_train"
    if not train_dir.exists():
        raise FileNotFoundError(
            f"Expected training images at {train_dir}. Did you run scripts/download_data.py?"
        )
    samples: list[Sample] = []
    for cls in CLASSES:
        cls_dir = train_dir / cls
        if not cls_dir.is_dir():
            raise FileNotFoundError(f"Missing class directory: {cls_dir}")
        for img_path in cls_dir.iterdir():
            if img_path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
                samples.append(Sample(img_path, CLASS_TO_IDX[cls]))
    return samples


class ASLDataset(Dataset):
    def __init__(self, samples: list[Sample], transform: Callable | None = None):
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        s = self.samples[idx]
        img = Image.open(s.path).convert("RGB")
        if self.transform is not None:
            img = self.transform(image=np.array(img))["image"]
        return img, s.label


def build_transforms(img_size: int = 224, train: bool = True):
    import albumentations as A
    from albumentations.pytorch import ToTensorV2

    mean = (0.485, 0.456, 0.406)
    std = (0.229, 0.224, 0.225)

    if train:
        return A.Compose(
            [
                A.LongestMaxSize(max_size=int(img_size * 1.15)),
                A.PadIfNeeded(min_height=int(img_size * 1.15), min_width=int(img_size * 1.15), border_mode=0),
                A.RandomResizedCrop(size=(img_size, img_size), scale=(0.75, 1.0), ratio=(0.9, 1.1)),
                A.Rotate(limit=15, border_mode=0, p=0.7),
                A.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.15, hue=0.05, p=0.7),
                A.GaussianBlur(blur_limit=(3, 5), p=0.2),
                A.CoarseDropout(num_holes_range=(1, 4), hole_height_range=(8, 24), hole_width_range=(8, 24), p=0.3),
                A.Normalize(mean=mean, std=std),
                ToTensorV2(),
            ]
        )
    return A.Compose(
        [
            A.LongestMaxSize(max_size=img_size),
            A.PadIfNeeded(min_height=img_size, min_width=img_size, border_mode=0),
            A.Normalize(mean=mean, std=std),
            ToTensorV2(),
        ]
    )


def get_dataloaders(
    root: Path | str = DEFAULT_ROOT,
    img_size: int = 224,
    batch_size: int = 128,
    val_fraction: float = 0.1,
    num_workers: int = 4,
    seed: int = 42,
) -> tuple[DataLoader, DataLoader]:
    """Return (train_loader, val_loader). Stratified by class."""
    root = Path(root)
    samples = _scan_train(root)
    labels = [s.label for s in samples]

    train_samples, val_samples = train_test_split(
        samples,
        test_size=val_fraction,
        stratify=labels,
        random_state=seed,
    )

    train_ds = ASLDataset(train_samples, transform=build_transforms(img_size, train=True))
    val_ds = ASLDataset(val_samples, transform=build_transforms(img_size, train=False))

    pin = torch.cuda.is_available()
    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=pin,
        persistent_workers=num_workers > 0,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size * 2,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin,
        persistent_workers=num_workers > 0,
    )
    return train_loader, val_loader


if __name__ == "__main__":
    samples = _scan_train(DEFAULT_ROOT)
    print(f"Found {len(samples)} samples across {len(CLASSES)} classes.")
    counts: dict[str, int] = {c: 0 for c in CLASSES}
    for s in samples:
        counts[IDX_TO_CLASS[s.label]] += 1
    for c in CLASSES:
        print(f"  {c:>8s}: {counts[c]}")
