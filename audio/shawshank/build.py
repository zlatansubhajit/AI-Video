# Original score + sound design for "Hope Chips Through" (shawshank_hope).
# Everything is synthesized from numpy/scipy primitives: no samples, no third-party
# audio. Voice is gain-only. Output: public/audio/shawshank_hope_mix.wav/.mp3.
import json
import os
import subprocess

import numpy as np
from scipy import ndimage, signal

import instruments as I
import sfx_gen as F
from dsp import (
    SR, ns, dbg, st, pan, place, lp, hp, bp, colored, smooth_noise, phase, modal, tt,
    fades, widen, read_wav, write_wav, integrated, momentary, momentary_max, true_peak,
)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PUB = os.path.join(ROOT, "public", "audio")
DUR = 1523 / 30.0
N = int(round(DUR * SR))
FPS = 30
SHOT = [0, 238, 473, 673, 958, 1134, 1263, 1523]
SHOT_T = [f / FPS for f in SHOT]
RAIN_T0, RAIN_T1 = SHOT_T[5], SHOT_T[6]  # rain_freedom only: 37.8s - 42.1s
KICK_T = [210 / FPS, 915 / FPS, 1030 / FPS, 1241 / FPS]


def log(*a):
    print("[mix]", *a, flush=True)


def load_voice():
    src = os.path.join(PUB, "shawshank_hope_voice.mp3")
    wav = os.path.join(HERE, "voice.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", str(SR), wav], check=True)
    x, sr = read_wav(wav)
    assert sr == SR
    v = x[0] if x.ndim == 1 else x[0]
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return st(out)


# ---------------------------------------------------------------- original textures
def rain_bed(dur, r, level=1.0):
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        hiss = hp(colored(n, r, 1.0), 900, 1) * (0.55 + 0.45 * smooth_noise(n, r, 26))
        body = lp(colored(n, r, 0.8), 420, 1) * 0.35
        clatter = hp(r.standard_normal(n), 2600) * (np.abs(smooth_noise(n, r, 18)) ** 3) * 0.7
        out[ch] = (hiss + body + clatter) * level
    return out


def room_tone(dur, r):
    n = ns(dur)
    rum = lp(colored(n, r, 1.6), 80, 2) * (0.6 + 0.4 * smooth_noise(n, r, 0.2))
    air = bp(colored(n, r, 0.6), 200, 900, 1) * 0.18
    return st(rum * 1.5 + air)


def thunder(r, close=0.8, dur=5.5):
    n = ns(dur)
    t = np.arange(n) / SR
    nz = colored(n, r, 1.3)
    rum = lp(nz, 85 + 40 * close, 2) + 0.35 * lp(nz, 260, 2)
    env = (1 - np.exp(-t / 0.15)) * np.exp(-t / 1.5)
    env *= 0.65 + 0.35 * smooth_noise(n, r, 0.5)
    crack = hp(r.standard_normal(n), 600) * np.exp(-t / 0.05) * (0.5 + 0.7 * close)
    crack += bp(r.standard_normal(n), 140, 1100, 1) * np.exp(-t / 0.16) * (0.8 + 0.6 * close)
    y = rum * env * 2.4 + crack
    return widen(fades(y, 0.002, 0.5), r, 18, 0.6)


def stone_tick(r):
    d = 0.22
    t = tt(d)
    y = modal(d, [(r.uniform(900, 1600), 0.7, 0.025), (r.uniform(2200, 3600), 0.5, 0.012),
                  (r.uniform(4200, 6000), 0.25, 0.006)], r)
    y += hp(r.standard_normal(ns(d)), 1500) * np.exp(-t / 0.002) * 0.4
    return y


def stone_crash(r):
    d = 2.4
    n = ns(d)
    t = np.arange(n) / SR
    boom = np.exp(-t / 0.45) * np.sin(phase(44 * (1 + 0.3 * np.exp(-t / 0.04)))) * 2.2
    boom += lp(r.standard_normal(n), 200, 2) * np.exp(-t / 0.12) * 1.2
    rub = F.rattle(d, r, 150, np.exp(-t / 0.65), heavy=True) * 0.95
    crack = F.wood_crack(r)
    y = boom + rub + np.pad(crack, (0, max(0, n - len(crack))))[:n] * 0.7
    return widen(fades(y, 0.0, 0.6), r, 14, 0.5)


def place_ev(buf, x, t, target, mode="momentary", p=0.0, gain=1.0):
    """normalize one event to an absolute LUFS target, then place it."""
    from dsp import norm_to
    y = norm_to(st(x) if np.ndim(x) == 2 else x, target, mode) if target is not None else x
    place(buf, pan(y, p) if np.ndim(y) == 1 else y, t, gain)


# ---------------------------------------------------------------- stems
def build_music(vI, r):
    m = np.zeros((2, N))
    rs = lambda k: np.random.default_rng(9000 + k)

    def note(f, t, vel=0.55, dur=2.2, p=0.0, kind="box"):
        seed = int(abs(t) * 977) % 99991
        x = I.musicbox(f, vel, rs(seed), dur) if kind == "box" else I.glock(f, vel, rs(seed), dur)
        place(m, pan(x, p), t, 1.0)

    # pad bed: D minor prison, Bb lift, A dominant, D major freedom, D at sunrise
    chords = [
        (0.0, 8.4, [50, 53, 57, 60], 0.26),
        (4.0, 5.2, [50, 53, 57, 65], 0.26),
        (8.0, 5.2, [46, 53, 58, 65], 0.28),
        (12.0, 5.2, [43, 50, 55, 62], 0.3),
        (16.0, 5.2, [50, 53, 57, 65], 0.26),
        (20.0, 5.2, [46, 53, 58, 65], 0.28),
        (24.0, 5.2, [50, 53, 57, 65], 0.27),
        (28.0, 5.2, [43, 50, 55, 62], 0.3),
        (31.0, 4.4, [46, 53, 58, 65], 0.34),
        (34.333, 4.4, [45, 52, 57, 61], 0.4),
        (37.8, 5.2, [50, 54, 57, 62, 66], 0.46),
        (42.1, 4.8, [42, 54, 57, 62, 66], 0.44),
        (46.0, 3.0, [43, 50, 55, 59, 62], 0.4),
        (48.3, 3.2, [50, 54, 57, 62, 66], 0.42),
    ]
    for t, d, ms, vel in chords:
        x = I.pad([I.m2f(k) for k in ms], d, vel=vel, r=rs(int(t * 13) + 7), att=1.0, rel=1.4, warm=880, detune=6)
        place(m, st(x), t, 1.0)

    # low pulses under the chipping years
    for t in (22.9, 24.9, 26.9, 28.9, 30.9):
        x = I.pluck(I.m2f(38), 0.5, rs(int(t * 71)), 1.1)
        place(m, pan(x, -0.1), t, 0.9)

    # music-box motif
    notes = [
        (0.6, 74, .52), (2.2, 77, .48), (3.6, 81, .52), (5.4, 84, .45), (6.6, 81, .42), (7.4, 77, .4),
        (8.6, 82, .45), (10.2, 81, .42), (12.0, 79, .42), (13.8, 77, .46), (15.0, 74, .4),
        (16.4, 74, .44), (18.0, 77, .46), (19.6, 81, .48), (21.2, 84, .46),
        (22.8, 74, .4), (23.8, 77, .42), (24.8, 81, .44), (25.8, 77, .4),
        (26.8, 74, .4), (27.8, 77, .42), (28.8, 81, .44), (29.8, 84, .42),
        (30.8, 81, .4), (31.4, 77, .38),
        (32.2, 82, .5), (32.9, 81, .46), (33.6, 79, .46),
        (35.4, 76, .42), (36.0, 77, .44), (36.6, 79, .48), (37.1, 81, .52),
        (38.1, 86, .6), (39.1, 81, .5), (40.1, 78, .5), (41.0, 86, .56), (41.5, 81, .42),
        (42.5, 78, .5), (43.7, 81, .46), (44.9, 86, .52), (46.1, 78, .42),
        (47.3, 81, .46), (48.5, 86, .5), (49.5, 81, .38), (50.0, 86, .32),
    ]
    for t, mid, vel in notes:
        note(I.m2f(mid), t, vel, 2.4, p=np.sin(t * 0.7) * 0.25,
             kind="glock" if mid >= 86 or t >= 37.8 else "box")

    # timpani: patience, nineteen, shattered, storm, free
    for t, f, vel in [(7.0, 73.42, .9), (22.45, 73.42, .5), (30.5, 73.42, .8),
                      (32.0, 116.54, .55), (34.333, 73.42, .95), (34.333, 110.0, .6),
                      (37.8, 73.42, .8), (41.366, 73.42, .8), (42.1, 92.5, .55), (49.9, 73.42, .5)]:
        x = I.timpani(f, vel, rs(int(t * 31) + 3), 3.2)
        place(m, st(x), t, 1.0)

    for t, mid, vel in [(7.93, 86, .22), (15.77, 86, .2), (22.43, 86, .26),
                        (31.93, 82, .26), (37.8, 86, .42), (42.1, 86, .34)]:
        note(I.m2f(mid), t, vel, 3.0, 0.0, "glock")

    # duck under speech
    words = json.load(open(os.path.join(PUB, "shawshank_hope_words.json"), encoding="utf-8"))
    spans = []
    for w in words:
        s, e = float(w["start_s"]), float(w["end_s"])
        if spans and s - spans[-1][1] < 0.32:
            spans[-1][1] = max(spans[-1][1], e)
        else:
            spans.append([s, e])
    d = duck(spans)
    m *= dbg(d)[None, :]

    # one overall music level under the voice
    target = vI - 10.5
    cur = integrated(m)
    m *= dbg(target - cur)
    return m, cur, target


def duck(spans, depth=-2.5, pre=0.08, post=0.14, att=0.07, rel=0.4):
    ctrl = 1000
    nc = int(DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        tgt = va[i]
        e += (tgt - e) * (ka if tgt > e else kr)
        env[i] = e
    return np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env)


def build_sfx(vI, r):
    s = np.zeros((2, N))
    ev = place_ev

    # ---- world beds
    # Rain is a scene event, not a world bed: it exists only while Andy stands
    # in the downpour (rain_freedom, SHOT 5). No rain bed before RAIN_T0.
    cell = room_tone(SHOT_T[4], r)
    ev(s, cell, 0.0, vI - 22, "integrated", gain=1.0)
    ev(s, F.breeze(SHOT_T[2] - SHOT_T[1], r, level=1.0, bright=820), SHOT_T[1], vI - 17, "integrated", p=-0.1)
    ev(s, room_tone(SHOT_T[5] - SHOT_T[2], r), SHOT_T[2], vI - 22, "integrated")
    ev(s, F.breeze(SHOT_T[4] - SHOT_T[3] + 0.5, r, level=1.0, bright=700), SHOT_T[3], vI - 21, "integrated", p=0.1)
    ev(s, room_tone(SHOT_T[5] - SHOT_T[3], r), SHOT_T[3], vI - 23, "integrated")
    ev(s, F.breeze(SHOT_T[5] - SHOT_T[4] + 0.6, r, level=1.4, bright=650), SHOT_T[4], vI - 14, "integrated", p=0.0)
    ev(s, F.breeze(RAIN_T1 - RAIN_T0 + 0.4, r, level=1.5, bright=620), RAIN_T0, vI - 13, "integrated", p=0.0)
    ev(
        s,
        fades(rain_bed(RAIN_T1 - RAIN_T0, r), 0.25, 0.12),
        RAIN_T0,
        vI - 8,
        "integrated",
        p=0.0,
    )
    ev(s, F.water_bed(RAIN_T1 - RAIN_T0 + 0.3, r, close=0.7, slosh_rate=0.7), RAIN_T0 + 0.2, vI - 15, "integrated", p=0.0)
    ev(s, F.breeze(DUR - SHOT_T[6], r, level=1.1, bright=900), SHOT_T[6], vI - 18, "integrated", p=0.0)
    ev(s, F.bird_chirps(DUR - SHOT_T[6], r, density=0.34, kind="sparrow"), SHOT_T[6] + 0.3, vI - 20, "integrated", p=0.45)
    ev(s, F.bird_chirps(DUR - SHOT_T[6], r, density=0.16, kind="blackbird"), SHOT_T[6] + 1.2, vI - 19, "integrated", p=-0.4)
    ev(s, F.crickets(DUR - SHOT_T[6], r, voices=2), SHOT_T[6] + 0.5, vI - 27, "integrated", p=0.2)

    # ---- section cuts
    for i, t in enumerate(SHOT_T[1:], start=1):
        x = F.whoosh(1.1 if i != 5 else 1.6, r, peak=0.25, f_lo=180, f_hi=1500 + 500 * (i % 2), width=1.0, tail=0.38, air=0.1)
        ev(s, pan(x, 0.0), t - 0.45 if i in (1, 2, 5) else t - 0.3, vI - 12 if i == 5 else vI - 10, "momentary")

    # ---- hook: tiny metal glint as he turns the hammer
    ev(s, F.clink(r, 3400, 0.22, 0.8), 2.05, vI - 12, "momentary", p=0.3, gain=0.5)

    # ---- poster: paper rustle
    for t in (16.25, 17.35):
        x = F.whoosh(0.4, r, peak=0.1, f_lo=1600, f_hi=6500, width=1.3, tail=0.12, air=0.45)
        ev(s, pan(x, 0.35), t, vI - 9, "momentary", gain=0.55)

    # ---- chipping: hammer strikes aligned with Math.sin(t*6.2)
    k0 = 22.35
    strike = (np.pi / 2) / 6.2
    hits = []
    k = 0
    while True:
        t = strike + k * (2 * np.pi / 6.2)
        if t > SHOT_T[4] - 0.3:
            break
        if t > k0 + 0.15:
            hits.append(t)
        k += 1
    for i, t in enumerate(hits):
        g = 0.85 + 0.15 * np.sin(i * 1.7)
        ev(s, F.hammer_hit(r, big=0.55), t, vI - 1.0 - (i % 2) * 0.6, "momentary", gain=g)
        ev(s, pan(stone_tick(r), 0.25), t + 0.012, vI - 4.0, "momentary", gain=0.7)
        env = np.exp(-np.linspace(0, 1, ns(0.34)) * 3.2)
        ev(s, pan(F.rattle(0.34, r, 55, env, heavy=True), 0.3), t + 0.05, vI - 8, "momentary", gain=0.35)
    log("hammer strikes:", len(hits), hits[0] if hits else None, hits[-1] if hits else None)

    # ---- breach: wind swell, thunder, the wall letting go
    x = F.whoosh(2.2, r, peak=0.9, f_lo=120, f_hi=900, width=0.9, tail=0.6, air=0.08)
    ev(s, x, SHOT_T[4] + 0.2, vI - 7, "momentary")
    ev(s, thunder(r, 0.55), 32.72, vI - 1.5, "momentary", p=-0.2)
    ev(s, thunder(r, 1.0), 34.70, vI - 0.5, "momentary", p=0.15)
    ev(s, thunder(r, 0.8), 36.52, vI - 1.0, "momentary", p=-0.1)
    ev(s, stone_crash(r), 34.333, vI + 1.5, "momentary", p=0.0)
    env = np.exp(-np.linspace(0, 1, ns(2.6)) * 1.6)
    ev(s, pan(F.rattle(2.6, r, 95, env, heavy=True), -0.1), 34.40, vI - 4, "momentary", gain=0.6)
    ev(s, F.wood_crack(r), 34.345, vI - 1, "momentary", p=0.1, gain=0.55)

    # ---- storm: rain hits the ditch, thunder follows each flash
    ev(s, F.splash_big(r), SHOT_T[5] + 0.3, vI - 7, "momentary", p=-0.15, gain=0.5)
    ev(s, thunder(r, 1.2), 38.60, vI - 0.5, "momentary", p=-0.15)
    ev(s, thunder(r, 1.0), 40.15, vI - 1.0, "momentary", p=0.2)
    ev(s, thunder(r, 1.4), 41.60, vI + 0.5, "momentary", p=0.0)
    ev(s, F.bubbles(2.4, r, 50, 300, 1800, (0.006, 0.02)), 38.5, vI - 10, "momentary", p=0.3, gain=0.4)

    # ---- sunrise: a breath of wind through grass, a single chime
    ev(s, F.clink(r, 2900, 0.5, 0.6), SHOT_T[6] + 0.12, vI - 12, "momentary", gain=0.5, p=0.2)
    return s, hits


def section_fit(x, targets, fade=0.18):
    """scale each shot to its loudness target with a smooth crossfade at the cuts"""
    t = np.arange(x.shape[1]) / SR
    env = np.ones_like(t)
    for i, tg in enumerate(targets):
        a, b = ns(SHOT_T[i]), ns(SHOT_T[i + 1])
        cur = integrated(x[:, a:b])
        env[(t >= SHOT_T[i]) & (t < SHOT_T[i + 1])] = dbg(tg - cur) if np.isfinite(cur) else 1.0
    w = max(1, ns(fade))
    k = np.hanning(w)
    env = np.convolve(env, k / k.sum(), mode="same")
    return x * env[None, :]


# ---------------------------------------------------------------- master
def limiter(x, ceil_db=-1.2, look=0.003, rel=0.08):
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g2 = g1.copy()
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        kr = 1 - np.exp(-1 / (rel * SR))
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = np.minimum(ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest"), 1.0)
    return x * g3[None, :], g3


def report(v, m, sfx):
    rows = []
    for i in range(7):
        a, b = ns(SHOT_T[i]), ns(SHOT_T[i + 1])
        vv, mm, ss = v[:, a:b], m[:, a:b], sfx[:, a:b]
        lv, lm, ls = integrated(vv), integrated(mm), integrated(ss)
        rows.append((i, lv, lm, ls, integrated(vv + mm + ss)))
    for r_ in rows:
        log(f"shot {r_[0]}: voice {r_[1]:6.1f}  music {r_[2]:6.1f}  sfx {r_[3]:6.1f}  bed {r_[4]:6.1f}")


def main():
    r = np.random.default_rng(4242)
    v = load_voice()
    vI = integrated(v)
    log(f"voice integrated {vI:.2f} LUFS, TP {true_peak(v):.2f} dBTP, {len(v[0])/SR:.2f}s")

    m, m0, mt = build_music(vI, r)
    log(f"music raw {m0:.2f} -> {integrated(m):.2f} LUFS (target {mt:.2f})")
    s, hits = build_sfx(vI, r)
    log(f"sfx raw integrated {integrated(s):.2f} LUFS")
    for i in range(7):
        a, b = ns(SHOT_T[i]), ns(SHOT_T[i + 1])
        log(f"sfx raw shot {i}: {integrated(s[:, a:b]):6.2f} LUFS")
    s = section_fit(s, [vI + d for d in (-14.0, -11.5, -11.5, -5.5, -4.0, -3.0, -8.5)])
    log(f"sfx fitted integrated {integrated(s):.2f} LUFS")

    mix0 = v + m + s
    G = -15.0 - integrated(mix0)
    for it in range(4):
        y, gr = limiter(mix0 * dbg(G))
        L = integrated(y)
        log(f"master {it}: gain {G:+.2f} dB -> {L:.2f} LUFS, TP {true_peak(y):.2f}, GR {(-20*np.log10(gr.min())):.2f} dB")
        if abs(L + 15.0) < 0.05:
            break
        G += -15.0 - L
    y = fades(y, 0.0, 0.06)

    report(v * dbg(G), m * dbg(G), s * dbg(G))
    log(f"stems at master gain: voice TP {true_peak(v*dbg(G)):.2f}  music TP {true_peak(m*dbg(G)):.2f}  sfx TP {true_peak(s*dbg(G)):.2f}")
    wav = os.path.join(PUB, "shawshank_hope_mix.wav")
    write_wav(wav, y)
    mp3 = os.path.join(PUB, "shawshank_hope_mix.mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "192k", mp3], check=True)
    log("wrote", wav, "and", mp3, f"({len(y[0])/SR:.3f}s)")


if __name__ == "__main__":
    main()
