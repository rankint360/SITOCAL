const palettes = ['Original', 'Amber', 'Nature', 'Violet', 'Caffeine', 'Glass', 'Ocean', 'Rose'];
const modes = ['System', 'Light', 'Dark'];
const cookieName = 'sitocal_appearance';

export function appearancePreference() {
  const value = document.cookie.split('; ').find(cookie => cookie.startsWith(cookieName + '='))?.split('=')[1] || '';
  const [palette, mode] = value.split('.');
  return {
    palette: palettes.find(name => name.toLowerCase() === palette) || 'Original',
    mode: modes.find(name => name.toLowerCase() === mode) || ''
  };
}

export function mountAppearance() {
  const trigger = document.querySelector('[data-appearance]');
  if (!trigger) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'appearance-dialog';
  dialog.setAttribute('aria-label', 'Workspace appearance');
  dialog.innerHTML = `<form method="dialog"><button class="btn small" aria-label="Close appearance">×</button></form>
    <h2>Make it yours</h2><p>Choose a look for your workspace.</p>
    <div class="appearance-grid">${palettes.map(name => `<button type="button" class="btn appearance-card" data-palette="${name}"><span class="appearance-preview" aria-hidden="true"><i></i><i></i><i></i></span>${name}</button>`).join('')}</div>
    <fieldset><legend>Color mode</legend>${modes.map(name => `<button type="button" class="btn small" data-mode="${name}">${name}</button>`).join('')}</fieldset>`;
  trigger.after(dialog);
  const media = matchMedia('(prefers-color-scheme: dark)');
  const paint = () => {
    const {palette, mode} = appearancePreference();
    const html = document.documentElement;
    html.dataset.palette = palette.toLowerCase();
    if (mode) {
      html.dataset.theme = mode === 'Dark' || (mode === 'System' && media.matches) ? 'dark' : 'light';
      html.style.colorScheme = html.dataset.theme;
    }
    trigger.textContent = 'Appearance · ' + palette;
    dialog.querySelectorAll('[data-palette], [data-mode]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.palette === palette || button.dataset.mode === (mode || 'System')));
    });
  };
  trigger.addEventListener('appearance-refresh', paint);
  trigger.addEventListener('click', () => { paint(); dialog.showModal(); });
  dialog.addEventListener('click', event => {
    const button = event.target.closest('[data-palette], [data-mode]');
    if (!button) return;
    const current = appearancePreference();
    const value = (button.dataset.palette || current.palette) + '.' + (button.dataset.mode || current.mode);
    const domain = /(^|\.)sitocal\.com$/.test(location.hostname) ? '; Domain=sitocal.com' : '';
    document.cookie = cookieName + '=' + value.toLowerCase() + '; Path=/; Max-Age=31536000; SameSite=Lax' + domain + (location.protocol === 'https:' ? '; Secure' : '');
    paint();
  });
  paint();
}

if (typeof document !== 'undefined') {
  const refresh = () => document.querySelector('[data-appearance]')?.dispatchEvent(new Event('appearance-refresh'));
  window.addEventListener('focus', refresh);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => queueMicrotask(refresh));
  document.addEventListener('sitocal-account-theme', () => queueMicrotask(refresh));
}
