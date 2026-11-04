/** Iconos de trazo propios (sin dependencias). Cada uno es el contenido de un SVG de 24×24. */
const P: Record<string, string> = {
  vacuna: '<path d="M18 2l4 4M19 5l-9.5 9.5M16 8l-9 9-3 3-1-1 3-3 9-9M12 12l-2-2M8 16l-2-2"/><path d="M14.5 4.5l5 5"/>',
  desparasitacion: '<circle cx="12" cy="13" r="5"/><path d="M12 8V5M9 5h6M5 9l-2-2M19 9l2-2M4 14H2M22 14h-2M6 19l-2 2M18 19l2 2"/>',
  peso: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 10a4 4 0 018 0M12 10l2-2"/>',
  bano: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 002.5 2.5"/>',
  consulta: '<path d="M6 3v6a4 4 0 008 0V3M10 13v2a4 4 0 008 0v-1"/><circle cx="18" cy="12" r="2"/>',
  medicamento: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="M9.5 8.5l6 6"/>',
  gasto: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.4-2.5-1.2M12 6.5V8M12 16v1.5"/>',
  paw: '<ellipse cx="6.5" cy="10" rx="2" ry="2.6"/><ellipse cx="17.5" cy="10" rx="2" ry="2.6"/><ellipse cx="10" cy="5.5" rx="2" ry="2.6"/><ellipse cx="14" cy="5.5" rx="2" ry="2.6"/><path d="M12 11c-3 0-6 3.6-6 6.2 0 1.8 1.5 2.3 3 2 1-.2 2-.5 3-.5s2 .3 3 .5c1.5.3 3-.2 3-2 0-2.6-3-6.2-6-6.2z"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};
export function icon(name: string, size = 22): HTMLElement {
  const s = document.createElement("span");
  s.className = `ico ico-${name}`;
  s.setAttribute("aria-hidden", "true");
  s.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[name] ?? ""}</svg>`;
  return s;
}
