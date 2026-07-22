const THEMES = {
  dark: {
    name: 'Dark',
    bg: '#111111',
    bgSecondary: '#0a0a0a',
    bgTertiary: '#1a1a1a',
    bgHover: '#252525',
    bgActive: '#333333',
    border: '#2a2a2a',
    text: '#e0e0e0',
    textSecondary: '#888888',
    textMuted: '#555555',
    accent: '#7cacf8',
    accentGlow: 'rgba(124, 172, 248, 0.3)',
    accentSoft: 'rgba(124, 172, 248, 0.1)',
    green: '#4ade80',
    red: '#f87171',
    yellow: '#facc15',
    cyan: '#22d3ee',
    pink: '#f472b6',
    orange: '#fb923c',
  },
  light: {
    name: 'Light',
    bg: '#ffffff',
    bgSecondary: '#f5f5f5',
    bgTertiary: '#e8e8e8',
    bgHover: '#d4d4d4',
    bgActive: '#bcbcbc',
    border: '#d4d4d4',
    text: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#999999',
    accent: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.2)',
    accentSoft: 'rgba(59, 130, 246, 0.08)',
    green: '#16a34a',
    red: '#dc2626',
    yellow: '#ca8a04',
    cyan: '#0891b2',
    pink: '#db2777',
    orange: '#ea580c',
  },
  dracula: {
    name: 'Dracula',
    bg: '#282a36',
    bgSecondary: '#21222c',
    bgTertiary: '#343746',
    bgHover: '#44475a',
    bgActive: '#525577',
    border: '#44475a',
    text: '#f8f8f2',
    textSecondary: '#6272a4',
    textMuted: '#5a5e7a',
    accent: '#bd93f9',
    accentGlow: 'rgba(189, 147, 249, 0.3)',
    accentSoft: 'rgba(189, 147, 249, 0.1)',
    green: '#50fa7b',
    red: '#ff5555',
    yellow: '#f1fa8c',
    cyan: '#8be9fd',
    pink: '#ff79c6',
    orange: '#ffb86c',
  },
  gruvbox: {
    name: 'Gruvbox',
    bg: '#282828',
    bgSecondary: '#1d2021',
    bgTertiary: '#3c3836',
    bgHover: '#504945',
    bgActive: '#665c54',
    border: '#504945',
    text: '#ebdbb2',
    textSecondary: '#928374',
    textMuted: '#7c6f64',
    accent: '#d79921',
    accentGlow: 'rgba(215, 153, 33, 0.3)',
    accentSoft: 'rgba(215, 153, 33, 0.1)',
    green: '#b8bb26',
    red: '#fb4934',
    yellow: '#fabd2f',
    cyan: '#83a598',
    pink: '#d3869b',
    orange: '#fe8019',
  },
  nord: {
    name: 'Nord',
    bg: '#2e3440',
    bgSecondary: '#272c36',
    bgTertiary: '#3b4252',
    bgHover: '#434c5e',
    bgActive: '#4c566a',
    border: '#434c5e',
    text: '#eceff4',
    textSecondary: '#616e88',
    textMuted: '#4c566a',
    accent: '#88c0d0',
    accentGlow: 'rgba(136, 192, 208, 0.3)',
    accentSoft: 'rgba(136, 192, 208, 0.1)',
    green: '#a3be8c',
    red: '#bf616a',
    yellow: '#ebcb8b',
    cyan: '#8fbcbb',
    pink: '#b48ead',
    orange: '#d08770',
  },
  catppuccin: {
    name: 'Catppuccin',
    bg: '#1e1e2e',
    bgSecondary: '#181825',
    bgTertiary: '#313244',
    bgHover: '#45475a',
    bgActive: '#585b70',
    border: '#45475a',
    text: '#cdd6f4',
    textSecondary: '#6c7086',
    textMuted: '#585b70',
    accent: '#cba6f7',
    accentGlow: 'rgba(203, 166, 247, 0.3)',
    accentSoft: 'rgba(203, 166, 247, 0.1)',
    green: '#a6e3a1',
    red: '#f38ba8',
    yellow: '#f9e2af',
    cyan: '#94e2d5',
    pink: '#f5c2e7',
    orange: '#fab387',
  },
  tokyo: {
    name: 'Tokyo Night',
    bg: '#1a1b26',
    bgSecondary: '#16161e',
    bgTertiary: '#24283b',
    bgHover: '#292e42',
    bgActive: '#3b4261',
    border: '#292e42',
    text: '#c0caf5',
    textSecondary: '#565f89',
    textMuted: '#414868',
    accent: '#7aa2f7',
    accentGlow: 'rgba(122, 162, 247, 0.3)',
    accentSoft: 'rgba(122, 162, 247, 0.1)',
    green: '#9ece6a',
    red: '#f7768e',
    yellow: '#e0af68',
    cyan: '#7dcfff',
    pink: '#bb9af7',
    orange: '#ff9e64',
  },
  solarized: {
    name: 'Solarized Dark',
    bg: '#002b36',
    bgSecondary: '#001e27',
    bgTertiary: '#073642',
    bgHover: '#094959',
    bgActive: '#0a5c6e',
    border: '#094959',
    text: '#839496',
    textSecondary: '#586e75',
    textMuted: '#073642',
    accent: '#b58900',
    accentGlow: 'rgba(181, 137, 0, 0.3)',
    accentSoft: 'rgba(181, 137, 0, 0.1)',
    green: '#859900',
    red: '#dc322f',
    yellow: '#b58900',
    cyan: '#2aa198',
    pink: '#d33682',
    orange: '#cb4b16',
  },
  monokai: {
    name: 'Monokai',
    bg: '#272822',
    bgSecondary: '#1e1f1c',
    bgTertiary: '#3e3d32',
    bgHover: '#49483e',
    bgActive: '#5a5950',
    border: '#49483e',
    text: '#f8f8f2',
    textSecondary: '#75715e',
    textMuted: '#5a5950',
    accent: '#a6e22e',
    accentGlow: 'rgba(166, 226, 46, 0.3)',
    accentSoft: 'rgba(166, 226, 46, 0.1)',
    green: '#a6e22e',
    red: '#f92672',
    yellow: '#e6db74',
    cyan: '#66d9ef',
    pink: '#f92672',
    orange: '#fd971f',
  },
  matrix: {
    name: 'Matrix',
    bg: '#0a0a0a',
    bgSecondary: '#050505',
    bgTertiary: '#111111',
    bgHover: '#1a1a1a',
    bgActive: '#222222',
    border: '#1a1a1a',
    text: '#00ff41',
    textSecondary: '#008f11',
    textMuted: '#005f0b',
    accent: '#00ff41',
    accentGlow: 'rgba(0, 255, 65, 0.4)',
    accentSoft: 'rgba(0, 255, 65, 0.08)',
    green: '#00ff41',
    red: '#ff0040',
    yellow: '#d4ff00',
    cyan: '#00ffcc',
    pink: '#ff00ff',
    orange: '#ff6600',
  },
  rose: {
    name: 'Rose Pine',
    bg: '#191724',
    bgSecondary: '#111119',
    bgTertiary: '#26233a',
    bgHover: '#2a273f',
    bgActive: '#393552',
    border: '#2a273f',
    text: '#e0def4',
    textSecondary: '#6e6a86',
    textMuted: '#393552',
    accent: '#ebbcba',
    accentGlow: 'rgba(235, 188, 186, 0.3)',
    accentSoft: 'rgba(235, 188, 186, 0.1)',
    green: '#31748f',
    red: '#eb6f92',
    yellow: '#f6c177',
    cyan: '#9ccfd8',
    pink: '#ebbcba',
    orange: '#ea9a97',
  },
};

let currentTheme = 'dracula';
const THEME_ORDER = Object.keys(THEMES);

function getTheme() {
  return THEMES[currentTheme];
}

function setTheme(name) {
  if (!THEMES[name]) return;
  currentTheme = name;
  const t = THEMES[name];
  const r = document.documentElement;
  r.style.setProperty('--bg', t.bg);
  r.style.setProperty('--bg-secondary', t.bgSecondary);
  r.style.setProperty('--bg-tertiary', t.bgTertiary);
  r.style.setProperty('--bg-hover', t.bgHover);
  r.style.setProperty('--bg-active', t.bgActive);
  r.style.setProperty('--border', t.border);
  r.style.setProperty('--text', t.text);
  r.style.setProperty('--text-secondary', t.textSecondary);
  r.style.setProperty('--text-muted', t.textMuted);
  r.style.setProperty('--accent', t.accent);
  r.style.setProperty('--accent-glow', t.accentGlow);
  r.style.setProperty('--accent-soft', t.accentSoft);
  r.style.setProperty('--green', t.green);
  r.style.setProperty('--red', t.red);
  r.style.setProperty('--yellow', t.yellow);
  r.style.setProperty('--cyan', t.cyan);
  try { localStorage.setItem('vybe-theme', name); } catch(e) {}
}

function cycleTheme() {
  const idx = THEME_ORDER.indexOf(currentTheme);
  const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
  setTheme(next);
  return THEMES[next].name;
}

function initThemes() {
  try {
    const saved = localStorage.getItem('vybe-theme');
    if (saved && THEMES[saved]) currentTheme = saved;
  } catch(e) {}
  setTheme(currentTheme);
}
