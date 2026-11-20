# Vice Frame 2 — GTA-style cover studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/0xvand/vice-frame-2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/0xvand/vice-frame-2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

**Vice Frame 2** turns your own photos into GTA-style cover art: a slanted
multi-panel collage of your cast, a retro-chrome striped title, cast tags,
a studio seal and a billing block — exported as a full-resolution PNG.
Your photos never leave your machine: the studio is plain static files,
runs offline in a desktop browser, and needs no account and no build step.

## What it does

- **Your cast, panel by panel.** Drop in photos (or start from the four
  bundled samples) and arrange them across the panels. Click a panel to
  select it, drag inside it to pan, scroll to zoom.
- **Seven layouts.** Heist Seven (seven slanted panels in three bands),
  Hero Pop-Out, Blockbuster Five, Grid Six, Quad Strip, Trio Slant and
  Showdown — every divider leaning, the way poster collages lean.
- **Hero pop-out.** In Hero Pop-Out the star's photograph breaks its frame
  line and spills into the neighbouring panel, shadow and all.
- **Face-aware smart crop.** Each panel frames its photo on the subject —
  faces and warm skin tones first, fine detail second — so nobody loses
  their head to a crop. One click re-frames; sliders fine-tune.
- **Nine colour grades.** Vice Sunset, Neon Night, Twilight Gold, Palm
  Dusk, Chrome Day, Noir Vice, Magenta Heat, Aqua Vice and Golden Hour —
  each a filter, a colour wash, a glow and a vignette in one click.
- **Retro-chrome lettering.** Your title set in hard-banded chrome with an
  extruded navy depth and an accent pinstripe, plus a letterspaced kicker
  and subtitle. Title at the top or stacked at the foot, poster-style.
- **Cast tags.** Name every panel's character — THE DRIVER, THE INSIDER,
  THE QUEENPIN — or write your own; the tag is set on a plaque at the
  panel's foot.
- **The finishing touches.** An original sun-and-palm studio seal, an
  editable two-line billing block, and adjustable film grain.
- **Slice mode.** One photograph spread across every panel, cut by the
  dividers into a single continuous scene.
- **Export that matches the preview.** Poster 1080 × 1350, Square
  1080 × 1080 or Wide 1920 × 1080 PNG. The preview canvas *is* the export
  canvas, so what you see is exactly what you share.

## Run it

Serve the app folder with the included server:

```
node serve.ts
```

then open http://localhost:8080 in a desktop browser. (Any static file
server pointed at `app/` works just as well.)

## How it is put together

- `main.ts` — the handover program: copies `app/` and `screenshots/` to
  the output directory and writes `dossier.json` with the kit's vendored
  dossier library.
- `app/index.html`, `app/style.css` — the studio's page and its dark
  control-room theme.
- `app/src/render.js` — the cover engine: panels, grades, pop-out, grain,
  cast tags, chrome lettering, seal and billing, all drawn on one canvas.
- `app/src/layouts.js` — the seven panel layouts and the cast list.
- `app/src/grades.js` — the nine colour grades.
- `app/src/focus.js` — the face-aware smart crop.
- `app/src/main.js` — the editor: state, controls, gestures, export.
- `app/src/shots.js` — the screenshot scenes declared in `shots.json`.
- `app/samples/` — four bundled photographs to demo with, no upload
  needed; `app/fonts/` — the display and text faces (Noto Sans family,
  OFL-licensed).
- `vendor/makefun-app.ts` — the bounty's dossier library, included
  unchanged as required.

Everything is original: the seal is drawn in code, the sample photographs
are the studio's own, and no artwork, logo or font from any game is used.
