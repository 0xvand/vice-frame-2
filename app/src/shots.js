// Shot mode: fixed scenes for the entry's screenshots.
//
// The screenshots in screenshots/ are captures of this app in a browser,
// taken from URLs listed in shots.json at the repository root. A `?shot=`
// query names the scene — `cover` shows one exported cover full-frame,
// `editor` shows the studio with a scene loaded — and the remaining
// parameters describe the cover itself: size, layout, grade, the sample
// photos to load (by their file name under samples/, without extension),
// the lettering and the cast. When the scene is painted, the page sets
// window.__shotReady so the capture tool knows the frame is final.
//
// Nothing here runs without a `shot` parameter: a person opening the app
// simply gets the studio.

/** Parses a shot query into a scene description, or null when not a shot. */
export function parseShot(query) {
  const shot = query.get('shot');
  if (!shot) return null;
  const list = (value) => (value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []);
  return {
    kind: shot,
    sizeId: query.get('size') ?? undefined,
    layoutId: query.get('layout') ?? undefined,
    gradeId: query.get('grade') ?? undefined,
    title: query.get('title') ?? undefined,
    subtitle: query.get('subtitle') ?? undefined,
    kicker: query.get('kicker') ?? undefined,
    titlePos: query.get('titlepos') ?? undefined,
    photos: list(query.get('photos') ?? query.get('photo')),
    roles: list(query.get('roles')),
    slice: query.get('slice') === '1',
    seal: query.get('seal') !== '0',
  };
}

/** Marks the painted scene ready for capture, two frames from now. */
export function signalShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
    document.body.classList.add('shot-ready');
  }));
}
