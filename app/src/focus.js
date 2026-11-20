// Face-aware smart cropping.
//
// When a photo is dropped into a panel far from the photo's own shape, a
// plain centre crop cuts heads off. This module looks at the photo once and
// remembers where its subject sits: it shrinks the photo to a thumbnail and
// scores every pixel for how much it looks like skin (two tone rules, so
// light and deep skin both count) and for how much fine detail it carries
// (hair, eyes and edges all score). A gentle pull towards the upper middle
// of the frame — where faces usually are — breaks ties. The focus point is
// the weighted centre of the strongest-scoring tenth of the thumbnail, and
// the renderer then frames the panel so that point stays in view.
//
// The analysis runs on the person's own machine, on a 96-pixel thumbnail,
// and is cached per image: nothing is uploaded and nothing is stored.

const cache = new WeakMap();

/** How likely one thumbnail pixel is to be skin, from 0 to 1. */
function skinScore(r, g, b) {
  // Rule one, the classic RGB test: red leads, a clear red-green gap.
  const classic = r > 92 && g > 38 && b > 18 && r > g && r > b && r - g > 14 && r - b < 130;
  // Rule two, in a luma/chroma split, which holds up better in shade and
  // for deeper skin: warm chroma with red above green above blue.
  const warm = r > g && g > b && r - b > 24 && r - b < 120 && r > 60;
  if (classic || warm) return 1;
  // A soft shoulder so near-skin tones still pull the focus a little.
  if (r > g && g >= b && r - b > 14 && r > 70) return 0.4;
  return 0;
}

/** Analyses an image element and returns its focus point { x, y } in 0..1. */
export function analyseFocus(img) {
  const width = 96;
  const height = Math.max(24, Math.round((width * img.naturalHeight) / img.naturalWidth));
  const thumb = document.createElement('canvas');
  thumb.width = width;
  thumb.height = height;
  const tctx = thumb.getContext('2d', { willReadFrequently: true });
  tctx.drawImage(img, 0, 0, width, height);
  let data;
  try {
    data = tctx.getImageData(0, 0, width, height).data;
  } catch {
    return { x: 0.5, y: 0.42 };
  }
  const scores = new Float32Array(width * height);
  let peak = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Fine detail: how far this pixel sits from its right and lower
      // neighbours in brightness.
      let detail = 0;
      if (x + 1 < width) detail += Math.abs(r - data[i + 4]) + Math.abs(g - data[i + 5]);
      if (y + 1 < height) {
        const j = i + width * 4;
        detail += Math.abs(r - data[j]) + Math.abs(b - data[j + 2]);
      }
      const dx = x / width - 0.5;
      const dy = y / height - 0.42;
      const pull = Math.exp(-(dx * dx + dy * dy) * 5.5);
      const score = skinScore(r, g, b) * 2.2 + Math.min(detail / 160, 1) * 0.7 + pull * 0.35;
      scores[y * width + x] = score;
      if (score > peak) peak = score;
    }
  }
  // The weighted centre of the strongest tenth of the frame.
  const floor = peak * 0.9;
  let sumX = 0;
  let sumY = 0;
  let sumW = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const score = scores[y * width + x];
      if (score >= floor) {
        const w = score - floor + 0.001;
        sumX += (x / width) * w;
        sumY += (y / height) * w;
        sumW += w;
      }
    }
  }
  if (sumW === 0) return { x: 0.5, y: 0.42 };
  return {
    x: Math.min(0.82, Math.max(0.18, sumX / sumW)),
    y: Math.min(0.82, Math.max(0.15, sumY / sumW)),
  };
}

/** The cached focus point for an image, analysing it on first use. */
export function focusFor(img) {
  let focus = cache.get(img);
  if (!focus) {
    focus = analyseFocus(img);
    cache.set(img, focus);
  }
  return focus;
}
