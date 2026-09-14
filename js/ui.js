const iconURL = new URL('../assets/icons.svg', import.meta.url).href;
export function icon(name) {
  return '<svg class="icon" width="20" height="20" aria-hidden="true"><use href="' + iconURL + '#' + name + '"></use></svg>';
}
export function initials(name = '') {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
}
export function readPreference(key, fallback = '') {
  try { return localStorage.getItem('dashly.' + key) || fallback; } catch { return fallback; }
}
export function writePreference(key, value) {
  try { localStorage.setItem('dashly.' + key, value); } catch { /* Preferences are optional. */ }
}
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#11141c' : '#f6f7fb');
}
