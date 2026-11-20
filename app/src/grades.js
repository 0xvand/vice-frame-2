// The nine colour grades of Vice Frame 2.
//
// A grade is applied in two passes. The `filter` string is a CSS filter the
// renderer sets on the canvas context while it draws each panel's photo, so
// the photographs themselves are re-coloured. The `wash` is a vertical
// gradient laid over the whole collage afterwards, and `glow` tints the
// light the renderer throws behind the title. `accent` is the colour the
// editor suggests for the subtitle, cast tags and seal while the grade is
// active, and `base` is the colour any unfilled corner of the canvas takes.
// `vignette` is the strength of the darkened edge the renderer finishes
// with, from 0 (none) to 1 (heavy).

export const GRADES = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    filter: 'saturate(1.38) contrast(1.09) brightness(1.02)',
    wash: [[0, 'rgba(64, 0, 92, 0.10)'], [0.55, 'rgba(255, 94, 58, 0.10)'], [1, 'rgba(146, 0, 110, 0.42)']],
    glow: 'rgba(255, 110, 64, 0.55)',
    accent: '#ffb03a',
    base: '#2a0e33',
    vignette: 0.42,
  },
  {
    id: 'neon',
    name: 'Neon Night',
    filter: 'saturate(1.55) contrast(1.16) brightness(0.98) hue-rotate(-8deg)',
    wash: [[0, 'rgba(190, 0, 255, 0.16)'], [0.5, 'rgba(0, 0, 60, 0.05)'], [1, 'rgba(0, 200, 255, 0.30)']],
    glow: 'rgba(255, 0, 180, 0.50)',
    accent: '#3ae2ff',
    base: '#0b0620',
    vignette: 0.5,
  },
  {
    id: 'twilight',
    name: 'Twilight Gold',
    filter: 'sepia(0.28) saturate(1.32) contrast(1.06) brightness(1.03)',
    wash: [[0, 'rgba(30, 16, 64, 0.22)'], [0.6, 'rgba(255, 150, 40, 0.08)'], [1, 'rgba(120, 40, 0, 0.34)']],
    glow: 'rgba(255, 176, 58, 0.55)',
    accent: '#ffd76a',
    base: '#1c1030',
    vignette: 0.45,
  },
  {
    id: 'dusk',
    name: 'Palm Dusk',
    filter: 'saturate(1.22) contrast(1.13) brightness(0.96)',
    wash: [[0, 'rgba(0, 60, 70, 0.20)'], [0.55, 'rgba(0, 0, 0, 0)'], [1, 'rgba(255, 110, 40, 0.30)']],
    glow: 'rgba(255, 140, 66, 0.45)',
    accent: '#ffb03a',
    base: '#0d2027',
    vignette: 0.48,
  },
  {
    id: 'chrome',
    name: 'Chrome Day',
    filter: 'saturate(1.12) contrast(1.03) brightness(1.06)',
    wash: [[0, 'rgba(40, 120, 255, 0.10)'], [0.7, 'rgba(0, 0, 0, 0)'], [1, 'rgba(0, 30, 80, 0.18)']],
    glow: 'rgba(120, 190, 255, 0.45)',
    accent: '#bfe0ff',
    base: '#10233d',
    vignette: 0.3,
  },
  {
    id: 'noir',
    name: 'Noir Vice',
    filter: 'saturate(0.32) contrast(1.28) brightness(0.92)',
    wash: [[0, 'rgba(0, 0, 0, 0.25)'], [0.5, 'rgba(0, 0, 0, 0)'], [1, 'rgba(0, 0, 0, 0.45)']],
    glow: 'rgba(200, 200, 220, 0.35)',
    accent: '#e8e8f2',
    base: '#0a0a0e',
    vignette: 0.72,
  },
  {
    id: 'magenta',
    name: 'Magenta Heat',
    filter: 'saturate(1.62) contrast(1.10) hue-rotate(-14deg) brightness(1.02)',
    wash: [[0, 'rgba(255, 0, 128, 0.14)'], [0.55, 'rgba(80, 0, 60, 0.06)'], [1, 'rgba(255, 0, 90, 0.36)']],
    glow: 'rgba(255, 60, 160, 0.55)',
    accent: '#ff7ad9',
    base: '#2b0718',
    vignette: 0.44,
  },
  {
    id: 'aqua',
    name: 'Aqua Vice',
    filter: 'saturate(1.34) contrast(1.08) hue-rotate(10deg)',
    wash: [[0, 'rgba(0, 80, 90, 0.16)'], [0.6, 'rgba(0, 0, 0, 0)'], [1, 'rgba(0, 160, 160, 0.30)']],
    glow: 'rgba(0, 220, 200, 0.45)',
    accent: '#54ffd8',
    base: '#06222a',
    vignette: 0.4,
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    filter: 'sepia(0.36) saturate(1.28) contrast(1.05) brightness(1.04)',
    wash: [[0, 'rgba(120, 60, 0, 0.12)'], [0.5, 'rgba(255, 170, 60, 0.10)'], [1, 'rgba(90, 30, 0, 0.32)']],
    glow: 'rgba(255, 190, 80, 0.55)',
    accent: '#ffcf5e',
    base: '#241203',
    vignette: 0.46,
  },
];

/** The grade with this id, or the first grade when the id is unknown. */
export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) ?? GRADES[0];
}
