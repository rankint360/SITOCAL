const palettes = ['Original', 'Amber', 'Nature', 'Violet', 'Caffeine', 'Glass', 'Ocean', 'Rose'];
const modes = ['System', 'Light', 'Dark'];
const cookieName = 'sitocal_appearance_v2';
let accountMode = '';

export function appearancePreference() {
  const cookies = document.cookie.split(';').map(cookie => cookie.trim());
  const read = name => cookies.find(cookie => cookie.startsWith(name + '='))?.slice(name.length + 1);
  const [palette, mode] = (read(cookieName) || read('sitocal_appearance') || '').split('.');
  return {
    palette: palettes.find(name => name.toLowerCase() === palette) || 'Original',
    mode: modes.find(name => name.toLowerCase() === mode) || accountMode || 'System'
  };
}

export function applyAppearance() {
  const {palette,mode} = appearancePreference();
  const dark = mode === 'Dark' || (mode === 'System' && matchMedia('(prefers-color-scheme: dark)').matches);
  const html = document.documentElement;
  html.dataset.palette = palette.toLowerCase();
  html.dataset.theme = dark ? 'dark' : 'light';
  html.style.colorScheme = html.dataset.theme;
  document.querySelectorAll('[data-site-theme]').forEach(button => {
    button.setAttribute('aria-pressed',String(dark));
    button.setAttribute('aria-label',dark ? 'Switch to bright view' : 'Switch to dark view');
    const icon=button.querySelector('[aria-hidden]');
    if(icon)icon.textContent=dark ? '☀' : '☾';
  });
  document.querySelectorAll('[data-appearance]').forEach(trigger => {
    trigger.textContent = 'Appearance · ' + palette;
    trigger.nextElementSibling?.querySelectorAll('[data-palette], [data-mode]').forEach(button => {
      button.setAttribute('aria-pressed',String(button.dataset.palette === palette || button.dataset.mode === mode));
    });
  });
}

export function saveAppearance(palette,mode) {
  const base = document.querySelector('meta[name="sitocal-domain"]')?.content || 'sitocal.com';
  const hostname = location.hostname;
  const domain = base.includes('.') && (hostname === base || hostname.endsWith('.' + base)) ? '; Domain=' + base : '';
  const value = (palette + '.' + mode).toLowerCase();
  document.cookie = cookieName + '=' + value + '; Path=/; Max-Age=31536000; SameSite=Lax' + domain + (location.protocol === 'https:' ? '; Secure' : '');
  applyAppearance();
}

export function mountAppearance() {
  document.querySelectorAll('[data-appearance]').forEach(trigger => {
    if(trigger.nextElementSibling?.matches('.appearance-dialog'))return;
    const dialog = document.createElement('dialog');
    dialog.className = 'appearance-dialog';
    dialog.setAttribute('aria-label', 'Workspace appearance');
    dialog.innerHTML = `<form method="dialog"><button class="btn small" aria-label="Close appearance">×</button></form>
      <h2>Make it yours</h2><p>Choose a look for your workspace.</p>
      <div class="appearance-grid">${palettes.map(name => `<button type="button" class="btn appearance-card" data-palette="${name}"><span class="appearance-preview" aria-hidden="true"><i></i><i></i><i></i></span>${name}</button>`).join('')}</div>
      <fieldset><legend>Color mode</legend>${modes.map(name => `<button type="button" class="btn small" data-mode="${name}">${name}</button>`).join('')}</fieldset>`;
    trigger.after(dialog);
    trigger.addEventListener('click', () => { applyAppearance(); dialog.showModal(); });
    dialog.addEventListener('click', event => {
      const button = event.target.closest('[data-palette], [data-mode]');
      if (!button) return;
      const current = appearancePreference();
      saveAppearance(button.dataset.palette || current.palette,button.dataset.mode || current.mode);
    });
  });
  applyAppearance();
}

if (typeof document !== 'undefined') {
  window.addEventListener('focus',applyAppearance);
  window.addEventListener('pageshow',applyAppearance);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyAppearance);
  document.addEventListener('sitocal-account-theme',event => {
    accountMode=modes.find(name => name.toLowerCase()===event.detail)||'';
    applyAppearance();
  });
}
