import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface WordTimestamp {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface ComicCallout {
  text: string;
  startFrame: number;
  durationFrames: number;
  color?: string;
  /** Normalized screen coordinates [0..1, 0..1]. */
  position?: [number, number];
  rotateDeg?: number;
}

interface WordCaptionsProps {
  /** Parsed word timestamps (e.g. imported from `<slug>_words.json`). */
  words?: WordTimestamp[];
  /**
   * Public-relative path to a `_words.json` file, e.g.
   * `"audio/farmer_gold_words.json"`. Loaded with `delayRender` so Remotion
   * never captures a frame before captions are ready.
   */
  wordsUrl?: string;
  maxWordsPerChunk?: 1 | 2;
  highlightWords?: string[];
  highlightColor?: string;
  /** Distance from bottom edge as percentage (22% clears YouTube Shorts UI). */
  bottomPercent?: number;
}

/**
 * Accepts either the v2 `{ word, startFrame, endFrame }` shape or the legacy
 * `{ word, start_s, end_s }` shape produced by `align_voice_timing.py`.
 */
function normalizeWords(raw: unknown, fps: number): WordTimestamp[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as any).words)
      ? (raw as any).words
      : [];

  return list
    .map((entry) => {
      const e = entry as Record<string, unknown>;
      const word = String(e?.word ?? "");
      if (typeof e?.startFrame === "number" && typeof e?.endFrame === "number") {
        return { word, startFrame: e.startFrame, endFrame: e.endFrame };
      }
      const startS =
        typeof e?.start_s === "number"
          ? e.start_s
          : typeof e?.start === "number"
            ? e.start
            : 0;
      const endS =
        typeof e?.end_s === "number"
          ? e.end_s
          : typeof e?.end === "number"
            ? e.end
            : startS;
      return {
        word,
        startFrame: Math.round(startS * fps),
        endFrame: Math.round(endS * fps),
      };
    })
    .filter((w) => w.word.length > 0);
}

/**
 * Groups raw word timestamps into punchy 1-2 word kinetic caption chunks.
 */
function buildChunks(words: WordTimestamp[], maxWords: 1 | 2) {
  const chunks: { text: string; startFrame: number; endFrame: number }[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    const slice = words.slice(i, i + maxWords);
    if (slice.length === 0) continue;
    chunks.push({
      text: slice.map((w) => w.word).join(" "),
      startFrame: slice[0].startFrame,
      endFrame: slice[slice.length - 1].endFrame,
    });
  }
  return chunks;
}

export const WordCaptions: React.FC<WordCaptionsProps> = ({
  words,
  wordsUrl,
  maxWordsPerChunk = 1,
  highlightWords = [],
  highlightColor = "#ffd83d",
  bottomPercent = 22,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [loaded, setLoaded] = useState<WordTimestamp[] | null>(null);
  const [loadHandle] = useState<number | null>(() =>
    wordsUrl ? delayRender(`Loading word captions: ${wordsUrl}`) : null
  );
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (!wordsUrl) return;
    let cancelled = false;

    const finish = () => {
      if (!resolvedRef.current && loadHandle !== null) {
        resolvedRef.current = true;
        continueRender(loadHandle);
      }
    };

    fetch(staticFile(wordsUrl))
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setLoaded(normalizeWords(json, fps));
      })
      .catch((err) => {
        console.error(`[WordCaptions] failed to load ${wordsUrl}`, err);
      })
      .finally(finish);

    return () => {
      cancelled = true;
      finish();
    };
  }, [wordsUrl, fps, loadHandle]);

  const source = words ?? loaded ?? [];
  const chunks = useMemo(
    () => buildChunks(source, maxWordsPerChunk),
    [source, maxWordsPerChunk]
  );

  const active = chunks.find(
    (c) => frame >= c.startFrame && frame <= c.endFrame + 2
  );
  if (!active) return null;

  const pop = spring({
    frame: frame - active.startFrame,
    fps,
    config: { damping: 14, stiffness: 280, mass: 0.5 },
  });

  const clean = active.text.replace(/[^a-zA-Z0-9$ ]/g, "").toLowerCase();
  const isHighlighted = highlightWords.some((hw) =>
    clean.includes(hw.toLowerCase())
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: `${bottomPercent}%`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: "'Montserrat', 'Arial Black', Impact, sans-serif",
          fontWeight: 900,
          fontSize: 88,
          lineHeight: 1.05,
          textTransform: "uppercase",
          textAlign: "center",
          color: isHighlighted ? highlightColor : "#ffffff",
          WebkitTextStroke: "14px #120c18",
          paintOrder: "stroke fill",
          textShadow: "0px 10px 0px #120c18, 0px 18px 28px rgba(0,0,0,0.45)",
          transform: `scale(${0.78 + pop * 0.22})`,
          padding: "0 48px",
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};

export const ComicCallouts: React.FC<{ callouts: ComicCallout[] }> = ({
  callouts,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {callouts.map((c, idx) => {
        const local = frame - c.startFrame;
        if (local < 0 || local > c.durationFrames) return null;

        const enter = spring({
          frame: local,
          fps,
          config: { damping: 11, stiffness: 260, mass: 0.6 },
        });
        const exitStart = c.durationFrames - 6;
        const exitScale =
          local > exitStart ? Math.max(0, 1 - (local - exitStart) / 6) : 1;

        const [xNorm, yNorm] = c.position ?? [0.5, 0.28];
        const rot = c.rotateDeg ?? (idx % 2 === 0 ? -5 : 5);

        return (
          <div
            key={`${c.text}-${idx}`}
            style={{
              position: "absolute",
              left: `${xNorm * 100}%`,
              top: `${yNorm * 100}%`,
              transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${enter * exitScale})`,
              backgroundColor: c.color ?? "#ffd83d",
              color: "#120c18",
              fontFamily: "'Montserrat', 'Arial Black', sans-serif",
              fontWeight: 900,
              fontSize: 74,
              padding: "14px 36px",
              borderRadius: 24,
              border: "9px solid #120c18",
              boxShadow: "0px 12px 0px #120c18",
              whiteSpace: "nowrap",
            }}
          >
            {c.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
