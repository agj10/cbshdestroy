const paths: Record<string, string> = {
  meteor:
    '<path d="m21 3-6 6M15 3l-4 4M21 9l-4 4"/><path d="M14.6 10a6.5 6.5 0 1 1-8.8-.6L10 5l.5 5.5 4.1-.5Z"/><path d="m7 13 2 2m-3 2h.01"/>',
  activity: '<path d="M2 12h4l3-8 6 16 3-8h4"/>',
  waves:
    '<path d="M2 6c3-4 7 4 10 0s7 4 10 0M2 12c3-4 7 4 10 0s7 4 10 0M2 18c3-4 7 4 10 0s7 4 10 0"/>',
  mountain:
    '<path d="m2 21 7-14 3 5 3-5 7 14ZM9 3l1-2m4 2 1-2M7 15l3 1 2-4 2 4 3-1"/>',
  droplets:
    '<path d="M12 3C9 7 5 10 5 14a7 7 0 0 0 14 0c0-4-4-7-7-11Z"/><path d="M9 14a3 3 0 0 0 3 3"/>',
  zap: '<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
  wind: '<path d="M2 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M2 16h7a3 3 0 1 1-3 3"/>',
  cloud:
    '<path d="M7 14a4 4 0 0 1-1-8 6 6 0 0 1 11 0 4 4 0 1 1 0 8"/><path d="M8 18h.01M12 16h.01M16 19h.01M10 22h.01"/>',
  flame:
    '<path d="M12 3c1 6 6 7 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 4 3 4 3 4s3-3 0-10Z"/>',
  burst:
    '<path d="m12 2 2 6 6-3-3 6 5 2-6 2 2 6-6-4-5 5 1-7-6-2 6-3-2-6 6 3Z"/>',
  plane: '<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13l5-5"/>',
  orbit:
    '<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/>',
  ufo: '<path d="M7 10a5 5 0 0 1 10 0"/><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="m6 19-1 2m7-2v3m6-3 1 2"/>',
  arrowup: '<path d="m5 10 7-7 7 7M12 3v18M4 21h16"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
  camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/>',
  box: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5M12 12v10M7 4.7l10 5.7"/>',
  top: '<path d="m12 3 10 6-10 6L2 9l10-6ZM2 15l10 6 10-6"/>',
  front:
    '<path d="M4 21V5h16v16M2 21h20M8 9h2m4 0h2M8 13h2m4 0h2M10 21v-4h4v4"/>',
  target:
    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  volume:
    '<path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5V4ZM16 9l5 6m-5 0 5-6"/>',
  settings:
    '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  leaf: '<path d="M20 3C4 1 0 19 10 20c8 1 11-8 10-17ZM6 19 16 8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  keyboard:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 16h8"/>',
};
export function icon(name: string, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.box}</svg>`;
}
