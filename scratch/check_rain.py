"""Check that the rain bed is confined to rain_freedom (shots 0-4 dry, shot 5 wet).

Run from the repo root:
  docker compose run --rm remotion python3 scratch/check_rain.py
  docker compose run --rm remotion python3 scratch/check_rain.py scratch/final_audio.wav
"""
import sys

import numpy as np
from scipy import signal

sys.path.insert(0, "audio/shawshank")
from dsp import read_wav, SR

path = sys.argv[1] if len(sys.argv) > 1 else "public/audio/shawshank_hope_mix.wav"
x, sr = read_wav(path)
if sr != SR:
    raise SystemExit(f"expected {SR} Hz, got {sr} Hz")
mono = x.mean(axis=0)

# Rain is broadband hiss; the 10th percentile is the continuous floor, so
# short voice/music/SFX peaks do not masquerade as rain.
sos = signal.butter(4, [2000, 8000], btype="bandpass", fs=SR, output="sos")
band = signal.sosfiltfilt(sos, mono)
hop = int(0.05 * SR)
n = len(band) // hop
frames = band[: n * hop].reshape(n, hop)
rms = 20 * np.log10(np.maximum(np.sqrt((frames**2).mean(axis=1)), 1e-12))
t = np.arange(n) * 0.05

shots = [0, 238, 473, 673, 958, 1134, 1263, 1523]
floors = []
print(f"{path}")
for i in range(7):
    a, b = shots[i] / 30.0, shots[i + 1] / 30.0
    m = (t >= a) & (t < b)
    floor = float(np.percentile(rms[m], 10))
    floors.append(floor)
    print(f"  shot {i}: {a:5.2f}-{b:5.2f}s  2-8 kHz floor {floor:6.1f} dBFS")

dry_floor = max(floors[:5])
rain_floor = floors[5]
sunrise_floor = floors[6]
print()
if rain_floor > dry_floor + 6.0 and sunrise_floor < rain_floor - 6.0:
    print(f"PASS: rain floor {rain_floor:.1f} dBFS is {rain_floor - dry_floor:.1f} dB "
          f"above the highest pre-rain shot floor and {rain_floor - sunrise_floor:.1f} dB "
          f"above sunrise.")
else:
    print(f"FAIL: rain floor {rain_floor:.1f}, pre-rain max {dry_floor:.1f}, "
          f"sunrise {sunrise_floor:.1f} dBFS")
    raise SystemExit(1)
