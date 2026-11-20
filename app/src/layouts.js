// Panel geometry for Vice Frame 2.
//
// A layout is a stack of horizontal rows. Each row has a top edge and a
// bottom edge, and each edge is allowed to slant: the edge's height is given
// at the left and at the right of the canvas and interpolated in between.
// Inside a row, vertical cuts divide it into panels; a cut may lean, so its
// x position at the row's top can differ from its x at the row's bottom.
// Rows and cuts together tile the canvas with the angled quads that give
// GTA-style covers their look. All coordinates are fractions of the canvas
// width and height, so one layout works at every export size.
//
// A panel is a plain object: { points: [[x, y], ...], hero: boolean }.
// `hero` marks the panel whose photo may break out of its frame (see the
// renderer): only layouts with a hero panel use the pop-out effect.

/** Interpolated height of a slanted edge at horizontal position x. */
function edgeHeight(edge, x) {
  return edge[0] + (edge[1] - edge[0]) * x;
}

/** Builds the panel quads for one row spec. */
function rowPanels(row) {
  const cuts = [{ top: 0, bottom: 0 }, ...row.cuts, { top: 1, bottom: 1 }];
  const panels = [];
  for (let i = 0; i < cuts.length - 1; i += 1) {
    const left = cuts[i];
    const right = cuts[i + 1];
    panels.push({
      hero: false,
      points: [
        [left.top, edgeHeight(row.top, left.top)],
        [right.top, edgeHeight(row.top, right.top)],
        [right.bottom, edgeHeight(row.bottom, right.bottom)],
        [left.bottom, edgeHeight(row.bottom, left.bottom)],
      ],
    });
  }
  return panels;
}

/** Expands a layout spec into its list of panels, in reading order. */
export function buildPanels(spec) {
  const panels = [];
  for (const row of spec.rows) panels.push(...rowPanels(row));
  if (typeof spec.hero === 'number' && panels[spec.hero]) panels[spec.hero].hero = true;
  return panels;
}

/** The bounding box of a panel, as fractions: { x, y, w, h }. */
export function panelBox(panel) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of panel.points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** The centre of a panel's bounding box: where its cast tag sits. */
export function panelCentre(panel) {
  const box = panelBox(panel);
  return { x: box.x + box.w / 2, y: box.y + box.h / 2, bottom: box.y + box.h };
}

/** True when the fractional point (x, y) falls inside a panel polygon. */
export function pointInPanel(panel, x, y) {
  let inside = false;
  const pts = panel.points;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Cast names handed out to panels in order until the user edits them. */
export const DEFAULT_CAST = [
  'THE DRIVER',
  'THE INSIDER',
  'THE MUSCLE',
  'THE BRAIN',
  'THE FIXER',
  'THE ROOKIE',
  'THE QUEENPIN',
];

/** Role suggestions offered as one-tap chips in the editor. */
export const ROLE_IDEAS = [
  'THE DRIVER',
  'THE INSIDER',
  'THE MUSCLE',
  'THE BRAIN',
  'THE FIXER',
  'THE ROOKIE',
  'THE QUEENPIN',
  'THE WHEELMAN',
  'THE LOOKOUT',
  'THE GHOST',
];

/**
 * The seven layouts. `rows` follow the spec described at the top of this
 * file; `hero` is the index of the pop-out panel where a layout has one.
 */
export const LAYOUTS = [
  {
    id: 'heropop',
    name: 'Hero Pop-Out',
    blurb: 'One star breaks the frame, two panels stack beside them',
    hero: 0,
    rows: [],
    // Not a row shape: a full-height hero beside a split column, assembled
    // directly by buildHeroPop below.
    assemble: 'heropop',
  },
  {
    id: 'heist7',
    name: 'Heist Seven',
    blurb: 'Seven slanted panels in three bands, the full ensemble',
    rows: [
      { top: [0, 0], bottom: [0.36, 0.30], cuts: [{ top: 0.52, bottom: 0.46 }] },
      { top: [0.36, 0.30], bottom: [0.70, 0.64], cuts: [{ top: 0.34, bottom: 0.31 }, { top: 0.67, bottom: 0.65 }] },
      { top: [0.70, 0.64], bottom: [1, 1], cuts: [{ top: 0.50, bottom: 0.47 }] },
    ],
  },
  {
    id: 'blockbuster5',
    name: 'Blockbuster Five',
    blurb: 'A wide top pair over a three-panel strip',
    rows: [
      { top: [0, 0], bottom: [0.55, 0.60], cuts: [{ top: 0.66, bottom: 0.62 }] },
      { top: [0.55, 0.60], bottom: [1, 1], cuts: [{ top: 0.36, bottom: 0.33 }, { top: 0.70, bottom: 0.68 }] },
    ],
  },
  {
    id: 'gridsix',
    name: 'Grid Six',
    blurb: 'Two rows of three, every divider leaning',
    rows: [
      { top: [0, 0], bottom: [0.52, 0.47], cuts: [{ top: 0.35, bottom: 0.32 }, { top: 0.68, bottom: 0.66 }] },
      { top: [0.52, 0.47], bottom: [1, 1], cuts: [{ top: 0.33, bottom: 0.36 }, { top: 0.66, bottom: 0.69 }] },
    ],
  },
  {
    id: 'quad',
    name: 'Quad Strip',
    blurb: 'Four panels, two over two, clean and bold',
    rows: [
      { top: [0, 0], bottom: [0.50, 0.55], cuts: [{ top: 0.55, bottom: 0.50 }] },
      { top: [0.50, 0.55], bottom: [1, 1], cuts: [{ top: 0.48, bottom: 0.52 }] },
    ],
  },
  {
    id: 'trio',
    name: 'Trio Slant',
    blurb: 'Three tall leaning panels, one per star',
    rows: [
      { top: [0, 0], bottom: [1, 1], cuts: [{ top: 0.36, bottom: 0.30 }, { top: 0.69, bottom: 0.64 }] },
    ],
  },
  {
    id: 'showdown',
    name: 'Showdown',
    blurb: 'Two panels split by one long diagonal lean',
    rows: [
      { top: [0, 0], bottom: [1, 1], cuts: [{ top: 0.58, bottom: 0.42 }] },
    ],
  },
];

/**
 * The Hero Pop-Out layout is the one shape the row builder cannot express:
 * a full-height hero on the left and a two-panel column on the right.
 * It is assembled directly here.
 */
function buildHeroPop() {
  return [
    {
      hero: true,
      points: [[0, 0], [0.60, 0], [0.64, 1], [0, 1]],
    },
    {
      hero: false,
      points: [[0.60, 0], [1, 0], [1, 0.52], [0.615, 0.50]],
    },
    {
      hero: false,
      points: [[0.615, 0.50], [1, 0.52], [1, 1], [0.64, 1]],
    },
  ];
}

/** Panels for a layout id, freshly built on every call. */
export function panelsFor(layoutId) {
  const spec = LAYOUTS.find((layout) => layout.id === layoutId) ?? LAYOUTS[0];
  if (spec.assemble === 'heropop') return buildHeroPop();
  return buildPanels(spec);
}
