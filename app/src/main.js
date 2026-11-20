// Vice Frame 2 — the studio's wiring.
//
// This module owns the cover's state (which photos sit in which panels,
// how each is framed, the layout, the grade, the lettering and the
// finishing touches), builds the control panel from the layout and grade
// catalogues, and keeps the live preview — the same canvas the export
// writes — in step with every control. Photos are read from the person's
// own machine and never leave it: the only loads are this app's own files
// and the bundled samples.

import { LAYOUTS, panelsFor, panelBox, pointInPanel, DEFAULT_CAST, ROLE_IDEAS } from './layouts.js';
import { GRADES, gradeById } from './grades.js';
import { SIZES, renderCover } from './render.js';
import { parseShot, signalShotReady } from './shots.js';

const SAMPLES = [
  { id: 'heist', name: 'Heist', src: 'samples/heist.jpg' },
  { id: 'neon', name: 'Neon', src: 'samples/neon.jpg' },
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier', src: 'samples/pier.jpg' },
];

const DEFAULT_BILLING = [
  'VICE FRAME STUDIO PRESENTS A LEONIDA PICTURE "VICE FRAME" STARRING THE DRIVER · THE INSIDER · THE MUSCLE · THE BRAIN · THE FIXER',
  'MUSIC BY THE PALM TONES · EDITED BY J. MARLOWE · DIRECTOR OF PHOTOGRAPHY R. VANCE · PRODUCED BY L. SOLANO · DIRECTED BY A. SOLANO',
].join('\n');

/** One panel's framing, as the renderer consumes it. */
function freshPanel(index, photoCount) {
  return {
    photo: photoCount ? index % photoCount : 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    focus: null,
    smart: true,
    role: DEFAULT_CAST[index % DEFAULT_CAST.length],
  };
}

const state = {
  sizeId: 'poster',
  layoutId: 'heist7',
  gradeId: 'sunset',
  title: 'VICE FRAME',
  subtitle: 'EVERY CITY HAS A PRICE',
  kicker: 'VICE FRAME STUDIO PRESENTS',
  titlePos: 'top',
  titleScale: 1,
  accent: '#ffb03a',
  slice: false,
  seal: true,
  billing: true,
  billingText: DEFAULT_BILLING,
  grain: 0.5,
  photos: [],
  panels: [],
  selected: 0,
};

const panelMemory = new Map();
const loadedSamples = new Map();

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const statusLine = $('statusLine');

function say(message) {
  statusLine.textContent = message;
}

/** Loads an image from a URL, resolving once it can be drawn. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Rebuilds the panel list for the current layout, remembering framing. */
function syncPanels() {
  const count = panelsFor(state.layoutId).length;
  const remembered = panelMemory.get(state.layoutId);
  state.panels = Array.from({ length: count }, (_, i) => (
    remembered?.[i] ?? freshPanel(i, state.photos.length)
  ));
  if (state.selected >= count) state.selected = 0;
}

/** Saves the current panel framing against the current layout. */
function rememberPanels() {
  panelMemory.set(state.layoutId, state.panels);
}

/** Redraws the cover and refreshes the photo strip's used markers. */
function refresh() {
  renderCover(canvas, state);
  document.querySelectorAll('#photoStrip figure').forEach((figure, i) => {
    figure.classList.toggle('used', state.panels.some((panel) => panel.photo === i));
  });
  document.querySelectorAll('#assignStrip button').forEach((button, i) => {
    button.classList.toggle('active', state.panels[state.selected]?.photo === i);
  });
}

/* ——— Photo intake ——— */

async function addPhoto(img, name) {
  state.photos.push(img);
  img.dataset.name = name;
  buildPhotoStrip();
  buildAssignStrip();
  // A panel still pointing past the end takes the new photo.
  state.panels.forEach((panel, i) => {
    if (panel.photo >= state.photos.length) panel.photo = i % state.photos.length;
  });
  refresh();
}

async function addPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  await addPhoto(img, file.name.replace(/\.[^.]+$/, ''));
}

async function addSample(sample) {
  if (loadedSamples.has(sample.id)) {
    const img = loadedSamples.get(sample.id);
    if (!state.photos.includes(img)) await addPhoto(img, sample.name);
    return;
  }
  const img = await loadImage(sample.src);
  loadedSamples.set(sample.id, img);
  await addPhoto(img, sample.name);
}

function buildPhotoStrip() {
  const strip = $('photoStrip');
  strip.replaceChildren();
  state.photos.forEach((img, i) => {
    const figure = document.createElement('figure');
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = img.dataset.name ?? `Photo ${i + 1}`;
    const caption = document.createElement('figcaption');
    caption.textContent = img.dataset.name ?? `Photo ${i + 1}`;
    figure.append(thumb, caption);
    strip.append(figure);
  });
}

function buildAssignStrip() {
  const strip = $('assignStrip');
  strip.replaceChildren();
  state.photos.forEach((img, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = `Put photo ${i + 1} in this panel`;
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = '';
    button.append(thumb);
    button.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      refresh();
    });
    strip.append(button);
  });
}

/* ——— Control builders ——— */

function buildSizeSelect() {
  const select = $('sizeSelect');
  for (const size of Object.values(SIZES)) {
    const option = document.createElement('option');
    option.value = size.id;
    option.textContent = size.name;
    select.append(option);
  }
  select.value = state.sizeId;
  select.addEventListener('change', () => {
    state.sizeId = select.value;
    refresh();
  });
}

function buildLayoutRow() {
  const row = $('layoutRow');
  for (const layout of LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.layout = layout.id;
    const name = document.createElement('span');
    name.className = 'opt-name';
    name.textContent = layout.name;
    const blurb = document.createElement('span');
    blurb.className = 'opt-blurb';
    blurb.textContent = layout.blurb;
    button.append(name, blurb);
    button.addEventListener('click', () => {
      if (state.layoutId === layout.id) return;
      rememberPanels();
      state.layoutId = layout.id;
      syncPanels();
      markActive(row, button);
      syncPanelControls();
      refresh();
    });
    if (layout.id === state.layoutId) button.classList.add('active');
    row.append(button);
  }
}

function buildGradeRow() {
  const row = $('gradeRow');
  for (const grade of GRADES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.grade = grade.id;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = `linear-gradient(180deg, ${grade.wash.map(([pos, color]) => `${color} ${Math.round(pos * 100)}%`).join(', ')}) , #333`;
    swatch.style.backgroundColor = grade.base;
    const name = document.createElement('span');
    name.className = 'opt-name';
    name.textContent = grade.name;
    button.append(swatch, name);
    button.addEventListener('click', () => {
      state.gradeId = grade.id;
      state.accent = grade.accent;
      $('accentInput').value = grade.accent;
      markActive(row, button);
      refresh();
    });
    if (grade.id === state.gradeId) button.classList.add('active');
    row.append(button);
  }
}

function buildSampleRow() {
  const row = $('sampleRow');
  const lead = document.createElement('span');
  lead.className = 'assign-label';
  lead.textContent = 'Samples:';
  row.append(lead);
  for (const sample of SAMPLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = sample.name;
    button.addEventListener('click', async () => {
      await addSample(sample);
      say(`${sample.name} added to your photos`);
    });
    row.append(button);
  }
}

function buildRoleChips() {
  const row = $('roleChips');
  for (const role of ROLE_IDEAS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = role;
    chip.addEventListener('click', () => {
      state.panels[state.selected].role = role;
      $('roleInput').value = role;
      refresh();
    });
    row.append(chip);
  }
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.textContent = 'NO TAG';
  clear.addEventListener('click', () => {
    state.panels[state.selected].role = '';
    $('roleInput').value = '';
    refresh();
  });
  row.append(clear);
}

function markActive(row, button) {
  row.querySelectorAll('button').forEach((other) => other.classList.toggle('active', other === button));
}

/** Points the panel controls at the selected panel. */
function syncPanelControls() {
  const panel = state.panels[state.selected];
  if (!panel) return;
  $('panelLabel').textContent = `— panel ${state.selected + 1} of ${state.panels.length}`;
  $('zoomRange').value = panel.zoom;
  $('panXRange').value = panel.panX;
  $('panYRange').value = panel.panY;
  $('roleInput').value = panel.role;
  document.querySelectorAll('#assignStrip button').forEach((button, i) => {
    button.classList.toggle('active', panel.photo === i);
  });
}

/* ——— Wiring ——— */

function wireControls() {
  $('photoFiles').addEventListener('change', async (event) => {
    for (const file of event.target.files) await addPhotoFile(file);
    say(`${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} in the studio`);
    event.target.value = '';
  });
  const drop = $('dropZone');
  drop.addEventListener('dragover', (event) => {
    event.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', async (event) => {
    event.preventDefault();
    drop.classList.remove('over');
    for (const file of event.dataTransfer.files) {
      if (file.type.startsWith('image/')) await addPhotoFile(file);
    }
  });
  $('sliceMode').addEventListener('change', (event) => {
    state.slice = event.target.checked;
    refresh();
  });
  const bindPanelSlider = (id, key) => {
    $(id).addEventListener('input', (event) => {
      state.panels[state.selected][key] = Number(event.target.value);
      refresh();
    });
  };
  bindPanelSlider('zoomRange', 'zoom');
  bindPanelSlider('panXRange', 'panX');
  bindPanelSlider('panYRange', 'panY');
  $('smartBtn').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.smart = true;
    panel.focus = null;
    panel.panX = 0;
    panel.panY = 0;
    refresh();
    say('Smart crop framed this panel on its subject');
  });
  $('centreBtn').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.smart = false;
    panel.focus = null;
    panel.panX = 0;
    panel.panY = 0;
    panel.zoom = 1;
    syncPanelControls();
    refresh();
  });
  $('roleInput').addEventListener('input', (event) => {
    state.panels[state.selected].role = event.target.value;
    refresh();
  });
  $('titleInput').addEventListener('input', (event) => {
    state.title = event.target.value;
    refresh();
  });
  $('subtitleInput').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    refresh();
  });
  $('kickerInput').addEventListener('input', (event) => {
    state.kicker = event.target.value;
    refresh();
  });
  const setTitlePos = (pos) => {
    state.titlePos = pos;
    $('titleTopBtn').classList.toggle('active', pos === 'top');
    $('titleBottomBtn').classList.toggle('active', pos === 'bottom');
    refresh();
  };
  $('titleTopBtn').addEventListener('click', () => setTitlePos('top'));
  $('titleBottomBtn').addEventListener('click', () => setTitlePos('bottom'));
  $('titleTopBtn').classList.add('active');
  $('titleScaleRange').addEventListener('input', (event) => {
    state.titleScale = Number(event.target.value);
    refresh();
  });
  $('accentInput').addEventListener('input', (event) => {
    state.accent = event.target.value;
    refresh();
  });
  $('sealToggle').addEventListener('change', (event) => {
    state.seal = event.target.checked;
    refresh();
  });
  $('billingToggle').addEventListener('change', (event) => {
    state.billing = event.target.checked;
    refresh();
  });
  $('billingText').addEventListener('input', (event) => {
    state.billingText = event.target.value;
    refresh();
  });
  $('grainRange').addEventListener('input', (event) => {
    state.grain = Number(event.target.value);
    refresh();
  });
  $('exportBtn').addEventListener('click', () => {
    const size = SIZES[state.sizeId];
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `vice-frame-2-${state.sizeId}-${size.w}x${size.h}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      say(`Saved vice-frame-2-${state.sizeId}-${size.w}x${size.h}.png`);
    }, 'image/png');
  });
}

/* ——— Canvas gestures: select, pan, zoom ——— */

function wireCanvas() {
  let drag = null;
  const toFraction = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width),
      y: ((event.clientY - rect.top) / rect.height),
    };
  };
  canvas.addEventListener('pointerdown', (event) => {
    const point = toFraction(event);
    const panels = panelsFor(state.layoutId);
    const hit = panels.findIndex((panel) => pointInPanel(panel, point.x, point.y));
    if (hit >= 0 && hit !== state.selected) {
      state.selected = hit;
      syncPanelControls();
      refresh();
    }
    const panel = state.panels[state.selected];
    drag = { x: event.clientX, y: event.clientY, panX: panel.panX, panY: panel.panY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const box = panelBox(panelsFor(state.layoutId)[state.selected]);
    const panel = state.panels[state.selected];
    panel.panX = drag.panX + ((event.clientX - drag.x) / rect.width) / box.w;
    panel.panY = drag.panY + ((event.clientY - drag.y) / rect.height) / box.h;
    panel.panX = Math.min(0.6, Math.max(-0.6, panel.panX));
    panel.panY = Math.min(0.6, Math.max(-0.6, panel.panY));
    $('panXRange').value = panel.panX;
    $('panYRange').value = panel.panY;
    refresh();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selected];
    panel.zoom = Math.min(2.8, Math.max(0.6, panel.zoom * (event.deltaY < 0 ? 1.06 : 0.94)));
    $('zoomRange').value = panel.zoom;
    refresh();
  }, { passive: false });
}

/* ——— Scenes ——— */

function fillLetteringFields() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('kickerInput').value = state.kicker;
  $('accentInput').value = state.accent;
  $('billingText').value = state.billingText;
  $('sealToggle').checked = state.seal;
  $('billingToggle').checked = state.billing;
  $('grainRange').value = state.grain;
  $('sliceMode').checked = state.slice;
}

/** The scene a person first meets: the four samples in the Heist Seven. */
async function loadDefaultScene() {
  for (const sample of SAMPLES) {
    const img = await loadImage(sample.src);
    loadedSamples.set(sample.id, img);
    state.photos.push(img);
    img.dataset.name = sample.name;
  }
  buildPhotoStrip();
  buildAssignStrip();
  syncPanels();
  syncPanelControls();
  refresh();
}

/** Applies a shot scene from shots.json (see src/shots.js). */
async function applyShot(shot) {
  if (shot.kind === 'cover') document.body.classList.add('shot-cover');
  if (shot.sizeId && SIZES[shot.sizeId]) state.sizeId = shot.sizeId;
  if (shot.layoutId && LAYOUTS.some((layout) => layout.id === shot.layoutId)) state.layoutId = shot.layoutId;
  if (shot.gradeId && GRADES.some((grade) => grade.id === shot.gradeId)) {
    state.gradeId = shot.gradeId;
    state.accent = gradeById(shot.gradeId).accent;
  }
  if (shot.title !== undefined) {
    state.title = shot.title;
    // The billing block quotes the picture's title; keep it in step.
    state.billingText = DEFAULT_BILLING.replaceAll('"VICE FRAME"', `"${shot.title.toUpperCase()}"`);
  }
  if (shot.subtitle !== undefined) state.subtitle = shot.subtitle;
  if (shot.kicker !== undefined) state.kicker = shot.kicker;
  if (shot.titlePos) state.titlePos = shot.titlePos;
  state.slice = shot.slice;
  state.seal = shot.seal;
  const names = shot.photos.length ? shot.photos : ['heist'];
  for (const name of names) {
    const sample = SAMPLES.find((item) => item.id === name);
    if (!sample) continue;
    const img = await loadImage(sample.src);
    loadedSamples.set(sample.id, img);
    state.photos.push(img);
    img.dataset.name = sample.name;
  }
  buildPhotoStrip();
  buildAssignStrip();
  syncPanels();
  state.panels.forEach((panel, i) => {
    panel.photo = state.photos.length ? i % state.photos.length : 0;
    if (shot.roles[i]) panel.role = shot.roles[i];
  });
  document.querySelectorAll('#layoutRow button').forEach((button) => {
    button.classList.toggle('active', button.dataset.layout === state.layoutId);
  });
  document.querySelectorAll('#gradeRow button').forEach((button) => {
    button.classList.toggle('active', button.dataset.grade === state.gradeId);
  });
  $('sizeSelect').value = state.sizeId;
  fillLetteringFields();
  syncPanelControls();
  refresh();
  signalShotReady();
}

/* ——— Start ——— */

buildSizeSelect();
buildLayoutRow();
buildGradeRow();
buildSampleRow();
buildRoleChips();
wireControls();
wireCanvas();
fillLetteringFields();

try {
  await Promise.race([
    Promise.all([
      document.fonts.load('90px "VF Display"'),
      document.fonts.load('700 30px "VF Sans"'),
      document.fonts.load('90px "VF Black"'),
    ]),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
} catch { /* fall back to whatever fonts are ready */ }

const shot = parseShot(new URLSearchParams(location.search));
if (shot) {
  await applyShot(shot);
} else {
  await loadDefaultScene();
}
