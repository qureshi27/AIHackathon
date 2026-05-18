"""Export best_landmark_transformer_v2.pt to ONNX for in-browser inference.

Reverse-engineered architecture (verified against state_dict shapes):
    Input:  (B, 21, 3)   wrist-centred, max-distance-scaled landmarks
    Body:   per-landmark Linear(3->192) + LayerNorm
            prepend learnable CLS token  -> (B, 22, 192)
            + learned positional encoding (1, 22, 192)
            6 x TransformerEncoderLayer (d=192, nhead=8, ffn=768, gelu, norm_first=True)
            final LayerNorm
    Head:   take CLS token output (B, 192)
            Linear(192, 512) -> GELU -> Dropout
            Linear(512, 256) -> GELU -> Dropout
            Linear(256, 29)
    Output: (B, 29) logits

Usage:
    python scripts/export_onnx.py
"""
from __future__ import annotations
import argparse
from pathlib import Path

import torch
import torch.nn as nn


class PositionalEncoding(nn.Module):
    def __init__(self, num_tokens: int = 22, d_model: int = 192):
        super().__init__()
        self.pe = nn.Parameter(torch.zeros(1, num_tokens, d_model))


class LandmarkTransformer(nn.Module):
    def __init__(
        self,
        num_classes: int = 29,
        d_model: int = 192,
        nhead: int = 8,
        num_layers: int = 6,
        dim_feedforward: int = 768,
        num_landmarks: int = 21,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        self.cls_token = nn.Parameter(torch.zeros(1, 1, d_model))
        self.input_proj = nn.Sequential(
            nn.Linear(3, d_model),
            nn.LayerNorm(d_model),
        )
        self.pos_enc = PositionalEncoding(num_tokens=num_landmarks + 1, d_model=d_model)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.transformer = nn.TransformerEncoder(
            encoder_layer, num_layers=num_layers, norm=nn.LayerNorm(d_model)
        )
        self.classifier = nn.Sequential(
            nn.Linear(d_model, 512),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(512, 256),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, 21, 3)
        h = self.input_proj(x)                          # (B, 21, D)
        cls = self.cls_token.expand(h.size(0), -1, -1)  # (B, 1, D)
        h = torch.cat([cls, h], dim=1)                  # (B, 22, D)
        h = h + self.pos_enc.pe                         # (B, 22, D)
        h = self.transformer(h)                         # (B, 22, D)
        return self.classifier(h[:, 0])                 # (B, num_classes)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--ckpt",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "best_landmark_transformer_v2.pt.zip",
        help="Path to checkpoint (.pt or .pt.zip). The .pt.zip is preferred since some hosts unzip the .pt into a directory.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "public" / "landmark_model.onnx",
    )
    parser.add_argument("--opset", type=int, default=17)
    args = parser.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)

    model = LandmarkTransformer()
    state = torch.load(args.ckpt, map_location="cpu", weights_only=False)
    if isinstance(state, dict) and "state_dict" in state:
        state = state["state_dict"]
    missing, unexpected = model.load_state_dict(state, strict=False)
    if missing:
        print("WARNING missing keys:")
        for k in missing:
            print(f"  {k}")
    if unexpected:
        print("WARNING unexpected keys:")
        for k in unexpected:
            print(f"  {k}")
    if not missing and not unexpected:
        print("Loaded checkpoint with strict match.")
    model.eval()

    with torch.no_grad():
        dummy = torch.zeros(1, 21, 3, dtype=torch.float32)
        out = model(dummy)
    print(f"Sanity forward pass: output shape = {tuple(out.shape)}")

    torch.onnx.export(
        model,
        dummy,
        str(args.out),
        input_names=["landmarks"],
        output_names=["logits"],
        dynamic_axes={"landmarks": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=args.opset,
        do_constant_folding=True,
    )
    size_kb = args.out.stat().st_size / 1024
    print(f"Wrote {args.out}  ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
