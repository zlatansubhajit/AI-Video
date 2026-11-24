# Cartoon 3D Short

A reusable pipeline for 48–70 s vertical animated story shorts: 2D characters in a colourful 3D world, with ink outlines, painted textures, lens blur, gliding cameras, and a synthesized score and sound effects. Everything is rendered with three.js inside Remotion on your own machine, with no AI video generator.

The original reference build is **The Bridge That Fell for a Song**, a 67 s short about the 1831 Broughton bridge. It remains the source for the ink/lens/grade engine and the audio toolkit in `templates/`. The current compact-drama reference is **shawshank_hope**, a 50.77 s, 7-shot all-code-stage build documented in section 11 of `SKILL.md`.

## What's inside
| Path | What it is |
|---|---|
| `SKILL.md` | The full pipeline, every rule, every fix, and the final look values |
| `templates/bridge/` | Full source of the original bridge short: world, characters, ink, lens blur, grade, story/camera |
| `templates/audio/` | Synthesized sound: SFX, march music, the mix with ducking and loudness |
| `templates/scripts/` | Stills, side-by-side sheets, shot merge and frame-by-frame QA helpers |
| `templates/SCRIPT_example.md` | Original bridge script (67 s) |
| `templates/SCRIPT_example_compact.md` | Compact-drama script for `shawshank_hope` (50.77 s) |
| `references/STYLE_BIBLE.md` | The script and visual formula measured from 20 reference shorts |
| `references/reports/` | Seven measured reports: motion, depth, textures, characters, lighting, outlines, grade |
| `references/frames/` | 38 full-size reference frames (540x960) to compare your frames against |
| `references/sheets/` | 20 contact sheets, one per reference short, 60 frames each (1,200 frames) |

## Install
1. Copy this folder into your agent's skills directory (for example `~/.claude/skills/` or `~/.opencode/skills/`).
2. You need [Remotion](https://www.remotion.dev/) with `@remotion/three`, plus Node, Python 3 and ffmpeg.
3. Ask your agent to use the cartoon short skill and make a short about a topic you choose.

Agents follow `SKILL.md`: topic and facts, then script, then voice, then the shot plan, then stills, then renders. Check your frames against the reports and reference frames, then deliver the final render and sound mix.

## Notes
- Set `REMOTION_TMP` to a folder on a big drive. Every Remotion bundle copies `public/` into the temp folder.
- Story, characters and voice should always be your own. Use the references for the look, not the content.
- The `templates/bridge/` source is the original reference build, kept for engine study; the compact-drama case study is in `SKILL.md` section 11.

## License
The code and docs are MIT (see `LICENSE`). The reference frames are included for style study only.
