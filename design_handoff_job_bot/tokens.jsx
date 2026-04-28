// tokens.jsx — design tokens for 3 variants × 2 themes
// Amber accent across all (oklch unified)

const AMBER = {
  50:  'oklch(97% 0.03 70)',
  100: 'oklch(93% 0.07 70)',
  200: 'oklch(88% 0.12 70)',
  300: 'oklch(82% 0.16 70)',
  400: 'oklch(76% 0.18 65)',
  500: 'oklch(70% 0.19 60)',   // primary amber
  600: 'oklch(62% 0.19 55)',
  700: 'oklch(52% 0.17 50)',
  800: 'oklch(42% 0.13 48)',
  900: 'oklch(32% 0.09 45)',
};

const TON_BLUE = '#0098EA';
const STAR_GOLD = 'oklch(78% 0.17 85)';

// ── Variant: MINIMAL (dark-first, Mono numerics, quiet glass)
const TOK_MIN = {
  name: 'Minimal',
  fontSans: '"Inter", -apple-system, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
  fontDisplay: '"Inter", system-ui, sans-serif',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  accent: AMBER[500],
  accentSoft: AMBER[900],
  accentInk: AMBER[300],
  dark: {
    bg: '#0B0B0E',
    bg2: '#121218',
    surface: '#17171F',
    surfaceHi: '#1E1E27',
    border: 'rgba(255,255,255,0.06)',
    borderHi: 'rgba(255,255,255,0.12)',
    text: '#F2F1EC',
    textDim: 'rgba(242,241,236,0.6)',
    textMute: 'rgba(242,241,236,0.35)',
    accent: AMBER[400],
    accentBg: 'rgba(230,145,60,0.10)',
    success: 'oklch(76% 0.15 155)',
    warn: AMBER[400],
    danger: 'oklch(65% 0.2 22)',
    tgHeaderBg: '#17212B',
    tgHeaderText: '#fff',
  },
  light: {
    bg: '#FAFAF7',
    bg2: '#F3F2EE',
    surface: '#FFFFFF',
    surfaceHi: '#FFFFFF',
    border: 'rgba(20,15,10,0.08)',
    borderHi: 'rgba(20,15,10,0.14)',
    text: '#14110C',
    textDim: 'rgba(20,17,12,0.6)',
    textMute: 'rgba(20,17,12,0.38)',
    accent: AMBER[600],
    accentBg: AMBER[50],
    success: 'oklch(50% 0.14 155)',
    warn: AMBER[600],
    danger: 'oklch(55% 0.2 22)',
    tgHeaderBg: '#527DA3',
    tgHeaderText: '#fff',
  },
};

// ── Variant: BOLD (editorial, huge type, slab headers)
const TOK_BOLD = {
  name: 'Bold',
  fontSans: '"Geist", "Inter", system-ui, sans-serif',
  fontMono: '"Geist Mono", ui-monospace, monospace',
  fontDisplay: '"Instrument Serif", "Playfair Display", Georgia, serif',
  radius: { sm: 4, md: 6, lg: 10, xl: 14, full: 9999 },
  accent: AMBER[500],
  accentSoft: AMBER[900],
  accentInk: AMBER[300],
  dark: {
    bg: '#0A0806',
    bg2: '#13100B',
    surface: '#1A150E',
    surfaceHi: '#231C12',
    border: 'rgba(230,180,120,0.10)',
    borderHi: 'rgba(230,180,120,0.20)',
    text: '#FAF3E6',
    textDim: 'rgba(250,243,230,0.58)',
    textMute: 'rgba(250,243,230,0.32)',
    accent: AMBER[400],
    accentBg: 'rgba(230,145,60,0.14)',
    success: 'oklch(78% 0.17 140)',
    warn: AMBER[400],
    danger: 'oklch(68% 0.22 22)',
    tgHeaderBg: '#1A150E',
    tgHeaderText: AMBER[300],
  },
  light: {
    bg: '#F6F1E8',
    bg2: '#EDE5D4',
    surface: '#FDFAF2',
    surfaceHi: '#FFFFFF',
    border: 'rgba(70,45,20,0.14)',
    borderHi: 'rgba(70,45,20,0.28)',
    text: '#1C1408',
    textDim: 'rgba(28,20,8,0.62)',
    textMute: 'rgba(28,20,8,0.4)',
    accent: AMBER[700],
    accentBg: AMBER[100],
    success: 'oklch(45% 0.15 140)',
    warn: AMBER[700],
    danger: 'oklch(50% 0.22 22)',
    tgHeaderBg: '#1C1408',
    tgHeaderText: AMBER[200],
  },
};

// ── Variant: PLAYFUL (warm, friendly, rounded, pastel amber)
const TOK_PLAY = {
  name: 'Playful',
  fontSans: '"Manrope", "Nunito", system-ui, sans-serif',
  fontMono: '"DM Mono", ui-monospace, monospace',
  fontDisplay: '"Fraunces", "Manrope", system-ui, sans-serif',
  radius: { sm: 12, md: 18, lg: 24, xl: 32, full: 9999 },
  accent: AMBER[500],
  accentSoft: AMBER[100],
  accentInk: AMBER[700],
  dark: {
    bg: '#1C1510',
    bg2: '#251B12',
    surface: '#2E2217',
    surfaceHi: '#3A2B1D',
    border: 'rgba(255,200,140,0.10)',
    borderHi: 'rgba(255,200,140,0.22)',
    text: '#FFF3E0',
    textDim: 'rgba(255,243,224,0.65)',
    textMute: 'rgba(255,243,224,0.38)',
    accent: AMBER[400],
    accentBg: 'rgba(230,145,60,0.18)',
    success: 'oklch(78% 0.16 150)',
    warn: AMBER[400],
    danger: 'oklch(68% 0.2 22)',
    tgHeaderBg: '#2E2217',
    tgHeaderText: AMBER[200],
  },
  light: {
    bg: '#FFF8EC',
    bg2: '#FDEFD4',
    surface: '#FFFFFF',
    surfaceHi: '#FFFEFB',
    border: 'rgba(180,120,50,0.15)',
    borderHi: 'rgba(180,120,50,0.28)',
    text: '#2A1A08',
    textDim: 'rgba(42,26,8,0.62)',
    textMute: 'rgba(42,26,8,0.4)',
    accent: AMBER[600],
    accentBg: AMBER[100],
    success: 'oklch(48% 0.14 150)',
    warn: AMBER[600],
    danger: 'oklch(55% 0.2 22)',
    tgHeaderBg: AMBER[600],
    tgHeaderText: '#fff',
  },
};

const VARIANTS = { minimal: TOK_MIN, bold: TOK_BOLD, playful: TOK_PLAY };

// ── Status semantics
const STATUSES = {
  draft:      { label: 'Черновик',    color: 'textDim',  dot: 'textMute' },
  pending:    { label: 'Ожидает',      color: 'warn',     dot: 'warn' },
  paid:       { label: 'Оплачено',     color: 'accent',   dot: 'accent' },
  running:    { label: 'В работе',     color: 'accent',   dot: 'accent' },
  searching:  { label: 'Ищем',         color: 'accent',   dot: 'accent' },
  applying:   { label: 'Подаём',       color: 'accent',   dot: 'accent' },
  completed:  { label: 'Готово',       color: 'success',  dot: 'success' },
  failed:     { label: 'Ошибка',       color: 'danger',   dot: 'danger' },
  cancelled:  { label: 'Отменено',     color: 'textMute', dot: 'textMute' },
};

// ── 12 Categories with glyph + color
const CATEGORIES = [
  { id: 'tech',      label: 'IT / Tech',    glyph: '⌘' },
  { id: 'design',    label: 'Design',       glyph: '◐' },
  { id: 'marketing', label: 'Marketing',    glyph: '◈' },
  { id: 'sales',     label: 'Sales',        glyph: '↗' },
  { id: 'product',   label: 'Product',      glyph: '◉' },
  { id: 'finance',   label: 'Finance',      glyph: '$' },
  { id: 'hr',        label: 'HR',           glyph: '◍' },
  { id: 'support',   label: 'Support',      glyph: '◯' },
  { id: 'content',   label: 'Content',      glyph: '¶' },
  { id: 'ops',       label: 'Operations',   glyph: '⚙' },
  { id: 'data',      label: 'Data',         glyph: '≈' },
  { id: 'web3',      label: 'Web3',         glyph: '◆' },
];

Object.assign(window, {
  VARIANTS, AMBER, TON_BLUE, STAR_GOLD, STATUSES, CATEGORIES,
});
