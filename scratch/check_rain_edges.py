import sys
import numpy as np
from scipy import signal

sys.path.insert(0, "audio/shawshank")
from dsp import read_wav, SR

x, sr = read_wav("public/audio/shawshank_hope_mix.wav")
mono = x.mean(axis=0)
sos = signal.butter(4, [2000, 8000], btype="bandpass", fs=SR, output="sos")
band = signal.sosfiltfilt(sos, mono)
hop = int(0.1 * SR)
n = len(band) // hop
rms = 20 * np.log10(np.maximum(np.sqrt((band[: n * hop].reshape(n, hop) ** 2).mean(axis=1)), 1e-12))
t = np.arange(n) * 0.1
for label, a, b in [("before rain", 36.8, 37.8), ("rain open", 38.0, 39.0),
                    ("rain close", 41.0, 42.0), ("after rain", 42.2, 43.2)]:
    m = (t >= a) & (t < b)
    print(f"{label:11s} {a:5.1f}-{b:5.1f}s  10th pct {np.percentile(rms[m], 10):6.1f}  median {np.median(rms[m]):6.1f} dBFS")
print("100 ms band RMS around the cuts:")
for a, b in [(37.4, 38.2), (41.8, 42.6)]:
    m = (t >= a) & (t < b)
    for ti, ri in zip(t[m], rms[m]):
        print(f"  {ti:5.2f}s  {ri:6.1f}")
