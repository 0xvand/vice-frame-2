// The Vice Frame 2 cover engine.
//
// Everything the app shows and exports is drawn here, from one state
// object, onto a 2D canvas at the export size. The live preview and the
// exported PNG are the same drawing at the same resolution, so what the
// user sees is exactly what they share.
//
// The drawing order is the poster's order: graded photographs clipped into
// slanted panels, the colour wash, the white poster dividers, the hero's
// pop-out (its photograph breaking over the frame line), film grain, cast
// tags, the retro-chrome title, the seal and the billing block.

import { panelsFor } from './layouts.js';
import { gradeById } from './grades.js';
import { focusFor } from './focus.js';

export const SIZES = {
  poster: { id: 'poster', name: 'Poster · 1080 × 1350', w: 1080, h: 1350 },
  square: { id: 'square', name: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  wide: { id: 'wide', name: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

export const DISPLAY_FONT = '"VF Display", "Noto Sans Display", sans-serif';
export const BLACK_FONT = '"VF Black", "Noto Sans Display", sans-serif';
export const SANS_FONT = '"VF Sans", "Noto Sans", sans-serif';

/** Scales a layout's fractional panels to pixel points for a W × H canvas. */
function pixelPanels(layoutId, W, H) {
  return panelsFor(layoutId).map((panel) => ({
    hero: panel.hero,
    points: panel.points.map(([x, y]) => [x * W, y * H]),
  }));
}

/** Traces a panel's polygon as the current path. */
function tracePanel(ctx, panel) {
  const pts = panel.points;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

/** The pixel bounding box of a pixel-space panel. */
function pixelBox(panel) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of panel.points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Where a photo lands when it fills a box: the scale that covers the box
 * (times the user's zoom) and the top-left corner such that the photo's
 * focus point appears at the same fractional position inside the box.
 * Pan is expressed in fractions of the box and added on top.
 */
function fillTransform(img, box, focus, zoom, panX, panY) {
  const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * zoom;
  const drawnW = img.naturalWidth * scale;
  const drawnH = img.naturalHeight * scale;
  return {
    scale,
    x: box.x + (box.w - drawnW) * focus.x + panX * box.w,
    y: box.y + (box.h - drawnH) * focus.y + panY * box.h,
    w: drawnW,
    h: drawnH,
  };
}

/** The focus a panel uses: its own override, else the photo's smart focus. */
function panelFocus(panelState, img) {
  if (panelState.focus) return panelState.focus;
  if (panelState.smart) return focusFor(img);
  return { x: 0.5, y: 0.45 };
}

/** Draws one panel's photograph, clipped to the panel's polygon. */
function drawPanelPhoto(ctx, panel, panelState, photos, grade, slice) {
  const img = photos[panelState.photo];
  if (!img) return;
  const box = pixelBox(panel);
  ctx.save();
  tracePanel(ctx, panel);
  ctx.clip();
  ctx.filter = grade.filter;
  if (slice) {
    // One photograph sliced by the panels: every panel shows the piece of
    // a single canvas-wide framing that falls inside it.
    const full = { x: 0, y: 0, w: ctx.canvas.width, h: ctx.canvas.height };
    const t = fillTransform(img, full, panelFocus(panelState, img), 1, 0, 0);
    ctx.drawImage(img, t.x, t.y, t.w, t.h);
  } else {
    const t = fillTransform(img, box, panelFocus(panelState, img), panelState.zoom, panelState.panX, panelState.panY);
    ctx.drawImage(img, t.x, t.y, t.w, t.h);
  }
  ctx.filter = 'none';
  ctx.restore();
}

/**
 * The pop-out: the hero's photograph drawn again over the frame line,
 * spilling past the hero panel's slanted edge into the panel beside it,
 * with a soft shadow along the break so the star stands off the page.
 */
function drawPopOut(ctx, panel, panelState, photos, grade, W, H) {
  const img = photos[panelState.photo];
  if (!img) return;
  const box = pixelBox(panel);
  // The spill: a quad that follows the hero's right edge down from the top
  // and leans an extra slice of canvas into the neighbouring panel,
  // tapering back to the edge a little past halfway down.
  const edge = panel.points;
  const topRight = edge[1];
  const bottomRight = edge[2];
  const spill = Math.min(W * 0.085, box.w * 0.24);
  const midY = box.y + box.h * 0.58;
  const midX = topRight[0] + (bottomRight[0] - topRight[0]) * 0.58;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(topRight[0] - 2, topRight[1] - 2);
  ctx.lineTo(topRight[0] + spill, topRight[1] - 2);
  ctx.lineTo(midX, midY);
  ctx.lineTo(topRight[0] - 2, box.y + box.h * 0.30);
  ctx.closePath();
  ctx.clip();
  ctx.filter = grade.filter;
  const t = fillTransform(img, box, panelFocus(panelState, img), panelState.zoom, panelState.panX, panelState.panY);
  ctx.drawImage(img, t.x, t.y, t.w, t.h);
  ctx.filter = 'none';
  // The same wash the rest of the collage wears, so the spill matches.
  drawWash(ctx, grade, W, H);
  ctx.restore();
  // The shadow line along the break.
  ctx.save();
  ctx.strokeStyle = 'rgba(5, 2, 10, 0.45)';
  ctx.lineWidth = Math.max(6, W * 0.008);
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(5, 2, 10, 0.6)';
  ctx.shadowBlur = Math.max(8, W * 0.012);
  ctx.beginPath();
  ctx.moveTo(topRight[0] + spill, topRight[1] + 2);
  ctx.lineTo(midX, midY);
  ctx.stroke();
  ctx.restore();
}

/** The grade's wash: a vertical gradient laid over the whole collage. */
function drawWash(ctx, grade, W, H) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  for (const [pos, color] of grade.wash) gradient.addColorStop(pos, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

/** Darkened edges, strength from the grade, so the poster feels printed. */
function drawVignette(ctx, grade, W, H) {
  const radius = Math.hypot(W, H) * 0.62;
  const gradient = ctx.createRadialGradient(W / 2, H * 0.46, radius * 0.42, W / 2, H * 0.52, radius);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(4, 2, 8, ${(grade.vignette * 0.62).toFixed(3)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

let grainPattern = null;

/** A small tile of deterministic film grain, built once. */
function buildGrainTile() {
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const image = tctx.createImageData(140, 140);
  let seed = 987654321;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 96 + Math.floor(next() * 64);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  tctx.putImageData(image, 0, 0);
  return tile;
}

/** Film grain over the photographs, below the lettering. */
function drawGrain(ctx, amount, W, H) {
  if (amount <= 0) return;
  if (!grainPattern) grainPattern = buildGrainTile();
  ctx.save();
  ctx.globalAlpha = 0.04 + amount * 0.09;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grainPattern, 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** A rounded rectangle path, for cast tag plaques. */
function traceRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** One cast tag: a dark plaque with an accent bar, at a panel's foot. */
function drawCastTag(ctx, panel, role, accent, W, H, floorY = H) {
  const box = pixelBox(panel);
  const fontSize = Math.max(13, H * 0.019);
  ctx.save();
  ctx.font = `700 ${fontSize}px ${SANS_FONT}`;
  try { ctx.letterSpacing = `${fontSize * 0.14}px`; } catch { /* older canvas */ }
  const text = role.toUpperCase();
  const textW = ctx.measureText(text).width;
  const padX = fontSize * 0.7;
  const w = textW + padX * 2 + fontSize * 0.5;
  const h = fontSize * 1.72;
  const cx = box.x + box.w / 2;
  const x = Math.min(Math.max(cx - w / 2, 8), W - w - 8);
  // The tag hugs its panel's foot, but never sinks into the strip the
  // caller reserves at the cover's foot (the billing block lives there).
  const y = Math.min(box.y + box.h - h - H * 0.016, floorY - h - H * 0.008);
  ctx.fillStyle = 'rgba(7, 5, 13, 0.80)';
  traceRoundedRect(ctx, x, y, w, h, h * 0.24);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(x + fontSize * 0.28, y + h * 0.22, fontSize * 0.20, h * 0.56);
  ctx.fillStyle = '#f5f1e6';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX + fontSize * 0.42, y + h * 0.54);
  ctx.restore();
}

/**
 * The retro-chrome title: striped metal lettering with a hard extruded
 * depth, the way eighties and nineties poster titles were airbrushed.
 * Drawn centred at (cx, top) and returns the height it used.
 */
function drawChromeTitle(ctx, text, cx, top, maxWidth, baseSize, accent) {
  const label = text.trim().toUpperCase() || 'VICE FRAME';
  let size = baseSize;
  ctx.save();
  const setFont = () => { ctx.font = `${size}px ${DISPLAY_FONT}`; };
  setFont();
  while (ctx.measureText(label).width > maxWidth && size > 18) {
    size *= 0.94;
    setFont();
  }
  const width = ctx.measureText(label).width;
  ctx.translate(cx, top);
  ctx.transform(1, 0, -0.055, 1, 0, 0);
  ctx.rotate(-0.018);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // The glow the grade throws behind the lettering.
  const glow = ctx.createRadialGradient(0, size * 0.5, size * 0.2, 0, size * 0.5, width * 0.72);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-width * 0.75, -size * 0.35, width * 1.5, size * 1.7);
  // Extruded depth: the letterform stamped down-right in poster navy.
  const depth = Math.max(3, Math.round(size * 0.055));
  ctx.shadowColor = 'rgba(3, 2, 8, 0.55)';
  ctx.shadowBlur = size * 0.10;
  ctx.shadowOffsetY = size * 0.03;
  ctx.fillStyle = '#131a36';
  for (let i = depth; i >= 1; i -= 1) {
    ctx.fillText(label, i * size * 0.016, i * size * 0.020);
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // The dark outline that separates metal from photograph.
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.052;
  ctx.strokeStyle = '#0a0d1f';
  ctx.strokeText(label, 0, 0);
  // The chrome itself: hard horizontal bands, mirror-bright at the
  // midline, with one hot pinstripe of accent colour through it.
  const chrome = ctx.createLinearGradient(0, 0, 0, size);
  chrome.addColorStop(0.00, '#fdfdff');
  chrome.addColorStop(0.16, '#c3cfec');
  chrome.addColorStop(0.30, '#67779f');
  chrome.addColorStop(0.44, '#e8f0ff');
  chrome.addColorStop(0.50, '#39466b');
  chrome.addColorStop(0.545, accent);
  chrome.addColorStop(0.60, '#8b9cc4');
  chrome.addColorStop(0.78, '#e6ecff');
  chrome.addColorStop(1.00, '#7c8cb2');
  ctx.fillStyle = chrome;
  ctx.fillText(label, 0, 0);
  // A last bright hairline along the top of each letter.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, 0, -size * 0.012);
  ctx.globalAlpha = 1;
  ctx.restore();
  return size * 1.04;
}

/** The subtitle: letterspaced capitals in the accent colour. */
function drawSubtitle(ctx, text, cx, top, maxWidth, H, accent) {
  const label = text.trim().toUpperCase();
  if (!label) return 0;
  let size = H * 0.027;
  ctx.save();
  const setFont = () => { ctx.font = `700 ${size}px ${SANS_FONT}`; };
  setFont();
  try { ctx.letterSpacing = `${size * 0.34}px`; } catch { /* older canvas */ }
  while (ctx.measureText(label).width > maxWidth && size > 10) {
    size *= 0.94;
    setFont();
    try { ctx.letterSpacing = `${size * 0.34}px`; } catch { /* older canvas */ }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = 'rgba(6, 4, 12, 0.85)';
  ctx.strokeText(label, cx, top);
  ctx.fillStyle = accent;
  ctx.fillText(label, cx, top);
  ctx.restore();
  return size * 1.5;
}

/** The kicker line above the title: small, wide-tracked, quiet. */
function drawKicker(ctx, text, cx, top, maxWidth, H) {
  const label = text.trim().toUpperCase();
  if (!label) return 0;
  const size = H * 0.0165;
  ctx.save();
  ctx.font = `700 ${size}px ${SANS_FONT}`;
  try { ctx.letterSpacing = `${size * 0.52}px`; } catch { /* older canvas */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(245, 241, 230, 0.88)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = size * 0.3;
  if (ctx.measureText(label).width <= maxWidth) ctx.fillText(label, cx, top);
  ctx.restore();
  return size * 1.7;
}

/**
 * The studio seal: an original sun-and-palm badge, drawn with arcs and a
 * ring of lettering. It is Vice Frame's own mark, in the corner of every
 * cover the studio makes, and it can be switched off.
 */
function drawSeal(ctx, cx, cy, radius, accent) {
  ctx.save();
  ctx.translate(cx, cy);
  // Disc and rings.
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(8, 6, 14, 0.78)';
  ctx.fill();
  ctx.lineWidth = radius * 0.075;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.80, 0, Math.PI * 2);
  ctx.lineWidth = radius * 0.028;
  ctx.strokeStyle = 'rgba(245, 241, 230, 0.75)';
  ctx.stroke();
  // A low sun over water: a half disc and two wave lines.
  ctx.beginPath();
  ctx.arc(0, radius * 0.16, radius * 0.30, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 241, 230, 0.9)';
  ctx.lineWidth = radius * 0.045;
  ctx.lineCap = 'round';
  for (const [dy, half] of [[0.30, 0.34], [0.44, 0.26]]) {
    ctx.beginPath();
    ctx.moveTo(-radius * half, radius * dy);
    ctx.quadraticCurveTo(0, radius * (dy - 0.09), radius * half, radius * dy);
    ctx.stroke();
  }
  // Palm fronds over the sun.
  ctx.strokeStyle = accent;
  ctx.lineWidth = radius * 0.05;
  for (const angle of [-2.75, -2.25, -1.75, -1.25, -0.75]) {
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.10);
    ctx.quadraticCurveTo(
      Math.cos(angle) * radius * 0.30,
      -radius * 0.10 + Math.sin(angle) * radius * 0.30 - radius * 0.10,
      Math.cos(angle) * radius * 0.52,
      -radius * 0.10 + Math.sin(angle) * radius * 0.52 + radius * 0.10,
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, radius * 0.28);
  ctx.quadraticCurveTo(radius * 0.05, radius * 0.02, 0, -radius * 0.10);
  ctx.stroke();
  // The ring lettering.
  ctx.fillStyle = 'rgba(245, 241, 230, 0.92)';
  ctx.font = `700 ${radius * 0.185}px ${SANS_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ringText = 'VICE FRAME STUDIO';
  const ringRadius = radius * 0.90;
  const sweep = Math.PI * 0.92;
  for (let i = 0; i < ringText.length; i += 1) {
    const a = -Math.PI / 2 - sweep / 2 + (sweep * i) / Math.max(1, ringText.length - 1);
    ctx.save();
    ctx.translate(Math.cos(a) * ringRadius, Math.sin(a) * ringRadius);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ringText[i], 0, 0);
    ctx.restore();
  }
  ctx.font = `700 ${radius * 0.20}px ${SANS_FONT}`;
  ctx.fillText('EST · 2026', 0, radius * 0.66);
  ctx.restore();
}

/** The billing block: two tight lines of small print at the poster's foot. */
function drawBilling(ctx, text, cx, bottom, maxWidth, H) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 2);
  if (!lines.length) return;
  const size = Math.max(9, H * 0.0128);
  ctx.save();
  ctx.font = `400 ${size}px ${SANS_FONT}`;
  try { ctx.letterSpacing = `${size * 0.06}px`; } catch { /* older canvas */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(238, 235, 226, 0.82)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = size * 0.35;
  lines.forEach((line, i) => {
    let out = line.toUpperCase();
    while (ctx.measureText(out).width > maxWidth && out.length > 8) out = out.slice(0, -4).trimEnd() + '…';
    ctx.fillText(out, cx, bottom - (lines.length - 1 - i) * size * 1.35);
  });
  ctx.restore();
}

/**
 * Draws the whole cover described by `state` onto `ctx` at W × H.
 * `state.photos` holds the loaded images; `state.panels` the per-panel
 * framing, in the layout's panel order.
 */
export function drawCoverArt(ctx, W, H, state) {
  const grade = gradeById(state.gradeId);
  const panels = pixelPanels(state.layoutId, W, H);
  ctx.fillStyle = grade.base;
  ctx.fillRect(0, 0, W, H);

  // Photographs: ordinary panels first, the hero last so its pop-out can
  // spill over its neighbour.
  const order = panels.map((panel, i) => i).sort((a, b) => Number(panels[a].hero) - Number(panels[b].hero));
  for (const i of order) {
    drawPanelPhoto(ctx, panels[i], state.panels[i], state.photos, grade, state.slice);
  }
  drawWash(ctx, grade, W, H);
  drawVignette(ctx, grade, W, H);

  // The white poster dividers.
  const gutter = Math.max(5, W * 0.0068);
  ctx.save();
  ctx.strokeStyle = '#f7f3e8';
  ctx.lineWidth = gutter;
  ctx.lineJoin = 'round';
  for (const panel of panels) {
    tracePanel(ctx, panel);
    ctx.stroke();
  }
  ctx.restore();

  // The hero breaks its frame.
  const heroIndex = panels.findIndex((panel) => panel.hero);
  if (heroIndex >= 0 && state.photos[state.panels[heroIndex].photo]) {
    drawPopOut(ctx, panels[heroIndex], state.panels[heroIndex], state.photos, grade, W, H);
  }

  drawGrain(ctx, state.grain, W, H);

  // Lettering metrics, worked out before the cast tags: the billing block
  // owns the cover's bottom strip when it is on, and a bottom title stacks
  // above it — the last row's tags must stop clear of both.
  const billingHeight = state.billing ? H * 0.045 : 0;
  const titleSize = H * 0.118 * state.titleScale;
  let tagFloor = state.billing ? H * 0.945 : H;
  if (state.titlePos === 'bottom') {
    // The whole lettering block — kicker, title, subtitle — stacks at the
    // foot, so the last row's tags rise above the block instead of
    // colliding with any line of it.
    const blockH = titleSize * 1.04 + H * 0.045 + H * 0.028;
    const blockTop = H - billingHeight - blockH - H * 0.018;
    tagFloor = Math.min(tagFloor, blockTop - H * 0.012);
  }

  // Cast tags at the foot of their panels.
  panels.forEach((panel, i) => {
    const role = state.panels[i].role;
    if (role && role.trim()) drawCastTag(ctx, panel, role, state.accent, W, H, tagFloor);
  });
  if (state.titlePos === 'top') {
    let y = H * 0.038;
    y += drawKicker(ctx, state.kicker, W / 2, y, W * 0.9, H);
    const used = drawChromeTitle(ctx, state.title, W / 2, y, W * 0.90, H * 0.118 * state.titleScale, state.accent);
    drawSubtitle(ctx, state.subtitle, W / 2, y + used + H * 0.008, W * 0.86, H, state.accent);
  } else {
    const blockH = titleSize * 1.04 + H * 0.045 + H * 0.028;
    let y = H - billingHeight - blockH - H * 0.018;
    y += drawKicker(ctx, state.kicker, W / 2, y, W * 0.9, H);
    const used = drawChromeTitle(ctx, state.title, W / 2, y, W * 0.90, titleSize, state.accent);
    drawSubtitle(ctx, state.subtitle, W / 2, y + used + H * 0.008, W * 0.86, H, state.accent);
  }
  if (state.seal) {
    const radius = Math.min(W, H) * 0.052;
    drawSeal(ctx, W - radius - W * 0.022, radius + H * 0.022, radius, state.accent);
  }
  if (state.billing) drawBilling(ctx, state.billingText, W / 2, H * 0.982, W * 0.78, H);
}

/** Renders `state` onto a canvas at its export size and returns the canvas. */
export function renderCover(canvas, state) {
  const size = SIZES[state.sizeId] ?? SIZES.poster;
  canvas.width = size.w;
  canvas.height = size.h;
  drawCoverArt(canvas.getContext('2d'), size.w, size.h, state);
  return canvas;
}
