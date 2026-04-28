// variants.jsx — 3 style modules (Minimal / Bold / Playful)
// Each exports a `style` bundle with render helpers used by screens.jsx

// ── MINIMAL: quiet, clean, mono-numerics, subtle borders
const STYLE_MINIMAL = {
  tok: null, // set later
  Headline: (text, pal, opts = {}) => (
    <div style={{
      fontSize: opts.size === 'md' ? 28 : 34,
      fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.8,
      color: pal.text, whiteSpace: 'pre-line',
      textAlign: opts.align || 'left',
    }}>{text}</div>
  ),
  SectionTitle: (text, pal, opts = {}) => (
    <div style={{
      fontSize: 11, fontWeight: 600, color: pal.textMute,
      textTransform: 'uppercase', letterSpacing: 1.2,
      marginTop: opts.mt || 0, marginBottom: 10,
    }}>{text}</div>
  ),
  Pill: (text, pal, opts = {}) => (
    <span key={opts.key} style={{
      padding: '6px 10px', borderRadius: 999,
      background: pal.bg2, color: pal.text,
      border: `1px solid ${pal.border}`,
      fontSize: 12, fontWeight: 500,
    }}>{text}</span>
  ),
  StatusBadge: (st, pal) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 8px', borderRadius: 6,
      background: pal.bg2, color: pal[st.color] || pal.text,
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
      border: `1px solid ${pal.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: pal[st.dot] || pal.text }}/>
      {st.label}
    </span>
  ),
  CategoryChip: (cat, pal) => (
    <span style={{
      width: 36, height: 36, borderRadius: 8,
      background: pal.bg2, border: `1px solid ${pal.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, fontWeight: 700, color: pal.accent,
      flexShrink: 0,
    }}>{cat.glyph}</span>
  ),
};

// ── BOLD: huge serif headlines, editorial, slab accents
const STYLE_BOLD = {
  tok: null,
  Headline: (text, pal, opts = {}) => (
    <div style={{
      fontFamily: '"Instrument Serif", Georgia, serif',
      fontSize: opts.size === 'md' ? 42 : 54,
      fontWeight: 400, fontStyle: 'italic', lineHeight: 0.98, letterSpacing: -1.5,
      color: pal.text, whiteSpace: 'pre-line',
      textAlign: opts.align || 'left',
    }}>{text}</div>
  ),
  SectionTitle: (text, pal, opts = {}) => (
    <div style={{
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      fontSize: 10, fontWeight: 600, color: pal.accent,
      textTransform: 'uppercase', letterSpacing: 2,
      marginTop: opts.mt || 0, marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ width: 16, height: 1, background: pal.accent }}/>
      {text}
    </div>
  ),
  Pill: (text, pal, opts = {}) => (
    <span key={opts.key} style={{
      padding: '5px 10px', borderRadius: 3,
      background: 'transparent', color: pal.text,
      border: `1px solid ${pal.borderHi}`,
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      fontSize: 11, fontWeight: 500, letterSpacing: 0.2,
      textTransform: 'lowercase',
    }}>{text}</span>
  ),
  StatusBadge: (st, pal) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 8px', borderRadius: 2,
      background: 'transparent',
      color: pal[st.color] || pal.text,
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2,
      border: `1px solid ${pal[st.dot] || pal.border}`,
    }}>
      <span style={{ width: 5, height: 5, background: pal[st.dot] || pal.text }}/>
      {st.label}
    </span>
  ),
  CategoryChip: (cat, pal) => (
    <span style={{
      width: 38, height: 38, borderRadius: 3,
      background: pal.accent, color: '#1a0f00',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20, fontWeight: 900, flexShrink: 0,
      fontFamily: '"Geist Mono", ui-monospace, monospace',
    }}>{cat.glyph}</span>
  ),
};

// ── PLAYFUL: warm, rounded, friendly, soft shadows
const STYLE_PLAYFUL = {
  tok: null,
  Headline: (text, pal, opts = {}) => (
    <div style={{
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: opts.size === 'md' ? 30 : 40,
      fontWeight: 600, lineHeight: 1.05, letterSpacing: -1,
      color: pal.text, whiteSpace: 'pre-line',
      textAlign: opts.align || 'left',
    }}>{text}</div>
  ),
  SectionTitle: (text, pal, opts = {}) => (
    <div style={{
      fontSize: 13, fontWeight: 700, color: pal.text,
      marginTop: opts.mt || 0, marginBottom: 10,
    }}>{text}</div>
  ),
  Pill: (text, pal, opts = {}) => (
    <span key={opts.key} style={{
      padding: '7px 14px', borderRadius: 999,
      background: pal.accentBg, color: pal.accent,
      fontSize: 13, fontWeight: 700,
    }}>{text}</span>
  ),
  StatusBadge: (st, pal) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 999,
      background: `${pal[st.dot] || pal.text}22`,
      color: pal[st.color] || pal.text,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: pal[st.dot] || pal.text }}/>
      {st.label}
    </span>
  ),
  CategoryChip: (cat, pal) => (
    <span style={{
      width: 44, height: 44, borderRadius: 18,
      background: pal.accent, color: '#1a0f00',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, fontWeight: 700, flexShrink: 0,
      boxShadow: `0 4px 12px ${pal.accent}44`,
    }}>{cat.glyph}</span>
  ),
  Hero: (pal) => (
    <div style={{
      width: 120, height: 120, borderRadius: 40,
      background: `linear-gradient(135deg, ${pal.accent}, ${pal.accentBg})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 20px 40px ${pal.accent}33`,
    }}>
      <span style={{ fontSize: 64 }}>✨</span>
    </div>
  ),
};

Object.assign(window, { STYLE_MINIMAL, STYLE_BOLD, STYLE_PLAYFUL });
