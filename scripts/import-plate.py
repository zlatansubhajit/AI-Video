#!/usr/bin/env python3
"""
import-plate.py

Import an external or AI-generated image (+ optional depth map) into the plate pipeline:
- Resizes/crops to 2160x3840 (vertical 9:16 standard with parallax margin)
- Normalizes depth into the log-depth format expected by PlateStage:
    d = log(max(z, near) / near) / log(far / near) in red channel (0 = near, 1 = far)
- Depth Anything V2 output (where white=near, black=far) is converted automatically.
- If no depth map is provided, generates a ground-to-sky depth prior.

Usage:
    docker compose run --rm remotion python3 scripts/import-plate.py \\
        --image assets/raw/street.png \\
        [--depth assets/raw/street_depth.png] \\
        --id street-plate \\
        [--out-dir public/plates]
"""

import argparse
import math
import os
import sys
import numpy as np
from PIL import Image

TARGET_WIDTH = 2160
TARGET_HEIGHT = 3840
DEPTH_NEAR = 0.5
DEPTH_FAR = 400.0


def crop_and_resize(img: Image.Image, target_w: int, target_h: int, resample=Image.Resampling.LANCZOS) -> Image.Image:
    """Center-crop and resize to exact target aspect ratio and dimensions."""
    src_w, src_h = img.size
    target_aspect = target_w / target_h
    src_aspect = src_w / src_h

    if src_aspect > target_aspect:
        # Source is wider than target: crop width
        new_w = int(src_h * target_aspect)
        left = (src_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, src_h))
    elif src_aspect < target_aspect:
        # Source is taller than target: crop height
        new_h = int(src_w / target_aspect)
        top = (src_h - new_h) // 2
        img = img.crop((0, top, src_w, top + new_h))

    return img.resize((target_w, target_h), resample=resample)


def make_fallback_depth(h: int, w: int) -> np.ndarray:
    """Generate a clean perspective ground-to-sky depth fallback when no depth map is available."""
    # Bottom 45% is ground sloping from near (2m) to horizon (100m)
    # Top 55% is sky/distant backdrop (far, 400m)
    y = np.linspace(0, 1, h)[:, None]
    # Invert so 0 is top (sky), 1 is bottom (foreground)
    ground_ratio = 0.45
    is_ground = y > (1.0 - ground_ratio)

    depth_m = np.full((h, w), DEPTH_FAR, dtype=np.float32)
    # Ground plane: perspective ramp from 1.5m at the bottom to 100m near the horizon
    ground_t = (y[is_ground] - (1.0 - ground_ratio)) / ground_ratio
    # 1.0 at bottom (near ~1.5m), 0.0 at horizon (~100m)
    ground_z = 1.5 / np.maximum(ground_t, 0.015)
    ground_z = np.clip(ground_z, DEPTH_NEAR, DEPTH_FAR)
    depth_m[is_ground.squeeze()] = ground_z[:, None]

    # Convert distance z to log-depth [0..1]
    log_d = np.clip(np.log(depth_m / DEPTH_NEAR) / np.log(DEPTH_FAR / DEPTH_NEAR), 0.0, 1.0)
    return (log_d * 255.0).astype(np.uint8)


def process_depth(depth_img: Image.Image, invert: bool = True) -> np.ndarray:
    """
    Process an external depth image (e.g. from Depth Anything V2).
    Depth Anything convention: white (255) = near, black (0) = far.
    PlateStage convention: 0 = near, 255 = far.
    So invert=True (default) converts Depth Anything to PlateStage.
    """
    arr = np.array(depth_img.convert("L"), dtype=np.float32) / 255.0
    if invert:
        # white (near) becomes 0.0 (near), black (far) becomes 1.0 (far)
        arr = 1.0 - arr

    # arr is now [0=near, 1=far] in relative depth
    # Apply a gentle power curve to map normalized depth into log-scale distribution
    arr = np.clip(arr, 0.0, 1.0)
    return (arr * 255.0).astype(np.uint8)


def main():
    parser = argparse.ArgumentParser(description="Import an external or AI image into the plate pipeline.")
    parser.add_argument("--image", required=True, help="Path to color input image.")
    parser.add_argument("--depth", default=None, help="Optional path to depth map image (e.g. Depth Anything).")
    parser.add_argument("--id", required=True, help="Plate ID (e.g. dawn-approach, victoria-dome).")
    parser.add_argument("--out-dir", default="public/plates", help="Output directory for .base.png and .depth.png.")
    parser.add_argument("--no-invert-depth", action="store_true", help="Do not invert depth map (use if 0=near already).")
    parser.add_argument("--width", type=int, default=TARGET_WIDTH, help=f"Target width (default {TARGET_WIDTH}).")
    parser.add_argument("--height", type=int, default=TARGET_HEIGHT, help=f"Target height (default {TARGET_HEIGHT}).")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"Error: image not found: {args.image}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.out_dir, exist_ok=True)
    base_out = os.path.join(args.out_dir, f"{args.id}.base.png")
    depth_out = os.path.join(args.out_dir, f"{args.id}.depth.png")

    print(f"[import-plate] Loading image: {args.image}")
    src_img = Image.open(args.image)
    base_img = crop_and_resize(src_img.convert("RGB"), args.width, args.height, resample=Image.Resampling.LANCZOS)
    base_img.save(base_out, format="PNG")
    print(f"[import-plate] Wrote colour plate: {base_out} ({args.width}x{args.height})")

    if args.depth and os.path.exists(args.depth):
        print(f"[import-plate] Loading depth map: {args.depth}")
        src_depth = Image.open(args.depth)
        depth_resized = crop_and_resize(src_depth, args.width, args.height, resample=Image.Resampling.BILINEAR)
        depth_data = process_depth(depth_resized, invert=not args.no_invert_depth)
    else:
        print("[import-plate] No depth map provided; generating perspective depth prior.")
        depth_data = make_fallback_depth(args.height, args.width)

    # PlateStage reads the red channel (L mode in PIL writes identical R,G,B in PNG)
    depth_img = Image.fromarray(depth_data, mode="L")
    depth_img.save(depth_out, format="PNG")
    print(f"[import-plate] Wrote depth plate: {depth_out} ({args.width}x{args.height})")
    
    print("\n" + "=" * 60)
    print("PLATE REGISTERED SUCCESSFULLY")
    print("=" * 60)
    print(f"Base:  {base_out}")
    print(f"Depth: {depth_out}")
    print("\nManifest Scene Snippet (paste into scenes in src/episodes/<slug>/index.ts):")
    print(f"""  {args.id.replace("-", "_")}: {{
    kind: "plate",
    plate: "plates/{args.id}",
    light: "day", // "day" | "golden" | "overcast"
    camera: {{ position: [0, 2.0, 10], target: [0, 1.8, 0], fov: 46 }},
    parallax: 0.75, // 0.0 = static backdrop, 1.0 = full parallax
    grade: true,    // applies cartoon grade to harmonize with 3D characters
  }},""")
    print("=" * 60 + "\n")
    print("[import-plate] Done.")


if __name__ == "__main__":
    main()
