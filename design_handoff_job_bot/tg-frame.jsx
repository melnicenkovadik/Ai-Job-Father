// tg-frame.jsx — iPhone frame + Telegram Mini App header/footer wrapper

function TGFrame({ variant, theme, children, title = 'AI Job Bot', scale = 1, onAction }) {
  const tok = VARIANTS[variant];
  const pal = tok[theme];
  const isDark = theme === 'dark';
  const W = 375, H = 812;

  return (
    <div style={{
      width: W * scale, height: H * scale,
      transform: `scale(${scale})`, transformOrigin: 'top left',
      position: 'relative',
    }}>
      <div style={{
        width: W, height: H,
        position: 'absolute', top: 0, left: 0,
        borderRadius: 52, overflow: 'hidden',
        background: '#000',
        boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 0 0 6px #1a1a1a, 0 0 0 8px #2a2a2a, 0 40px 80px rgba(0,0,0,0.25)',
        fontFamily: tok.fontSans,
        WebkitFontSmoothing: 'antialiased',
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          width: 120, height: 32, borderRadius: 20, background: '#000', zIndex: 60,
        }}/>

        {/* Status bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 44,
          background: pal.tgHeaderBg, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 30px 0',
          color: pal.tgHeaderText,
        }}>
          <span style={{ fontFamily: '-apple-system, "SF Pro", system-ui', fontSize: 15, fontWeight: 600 }}>9:41</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', opacity: 0.95 }}>
            <svg width="18" height="10" viewBox="0 0 18 10" fill={pal.tgHeaderText}>
              <rect x="0" y="6" width="3" height="4" rx="0.5"/>
              <rect x="4.5" y="4" width="3" height="6" rx="0.5"/>
              <rect x="9" y="2" width="3" height="8" rx="0.5"/>
              <rect x="13.5" y="0" width="3" height="10" rx="0.5"/>
            </svg>
            <Icon.Wifi fill={pal.tgHeaderText}/>
            <svg width="24" height="11" viewBox="0 0 24 11">
              <rect x="0.5" y="0.5" width="20" height="10" rx="2.5" stroke={pal.tgHeaderText} strokeOpacity="0.5" fill="none"/>
              <rect x="2" y="2" width="17" height="7" rx="1.2" fill={pal.tgHeaderText}/>
              <rect x="21.5" y="3.5" width="1.5" height="4" rx="0.5" fill={pal.tgHeaderText} opacity="0.5"/>
            </svg>
          </div>
        </div>

        {/* Telegram Mini App header */}
        <div style={{
          position: 'absolute', top: 44, left: 0, right: 0, height: 44,
          background: pal.tgHeaderBg, zIndex: 49,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px',
          color: pal.tgHeaderText,
          fontFamily: '-apple-system, system-ui',
        }}>
          <button style={{
            background: 'none', border: 'none', color: pal.tgHeaderText,
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 17, cursor: 'pointer', padding: 0,
          }}>
            <Icon.ChevronLeft size={22} stroke={pal.tgHeaderText}/>
            <span>Назад</span>
          </button>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>{title}</div>
          <button style={{
            background: 'none', border: 'none', color: pal.tgHeaderText,
            fontSize: 15, cursor: 'pointer', padding: 0, opacity: 0.9,
          }}>
            Закрыть
          </button>
        </div>

        {/* Content */}
        <div style={{
          position: 'absolute', top: 88, left: 0, right: 0, bottom: 0,
          background: pal.bg,
          color: pal.text,
          overflow: 'hidden',
        }}>
          {children}
        </div>

        {/* Home indicator */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 34,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          paddingBottom: 8, pointerEvents: 'none', zIndex: 70,
        }}>
          <div style={{
            width: 134, height: 5, borderRadius: 3,
            background: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)',
          }}/>
        </div>
      </div>
    </div>
  );
}

// Scrollable body helper (takes the content area minus optional MainButton)
function Body({ children, pal, pad = 16, hasMainButton = false }) {
  return (
    <div style={{
      height: '100%', overflowY: 'auto', overflowX: 'hidden',
      padding: pad, paddingBottom: hasMainButton ? 96 : (pad + 34),
      boxSizing: 'border-box',
      scrollbarWidth: 'none',
    }}>
      {children}
    </div>
  );
}

// Telegram-style MainButton at the bottom of the viewport
function MainButton({ pal, children, onClick, variant = 'solid', loading = false, radius = 12 }) {
  const isSolid = variant === 'solid';
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 34, padding: 12,
      zIndex: 40,
      background: `linear-gradient(to top, ${pal.bg} 40%, transparent)`,
    }}>
      <button onClick={onClick} style={{
        width: '100%', height: 50, borderRadius: radius,
        border: 'none', cursor: 'pointer',
        background: isSolid ? pal.accent : 'transparent',
        color: isSolid ? '#1a0f00' : pal.accent,
        outline: isSolid ? 'none' : `1.5px solid ${pal.accent}`,
        outlineOffset: -1.5,
        fontSize: 17, fontWeight: 600, letterSpacing: -0.3,
        fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {loading ? <Spinner color={isSolid ? '#1a0f00' : pal.accent}/> : children}
      </button>
    </div>
  );
}

function Spinner({ color = 'currentColor', size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeOpacity="0.25" strokeWidth="2.5" fill="none"/>
      <path d="M21 12a9 9 0 00-9-9" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// Common CSS keyframes
if (typeof document !== 'undefined' && !document.getElementById('jb-anim')) {
  const s = document.createElement('style');
  s.id = 'jb-anim';
  s.textContent = `
    @keyframes spin { to { transform: rotate(360deg) } }
    @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
    @keyframes shimmer {
      0% { background-position: -200% 0 }
      100% { background-position: 200% 0 }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px) }
      to { opacity: 1; transform: translateY(0) }
    }
    .jb-scroll::-webkit-scrollbar { display: none }
  `;
  document.head.appendChild(s);
}

Object.assign(window, { TGFrame, Body, MainButton, Spinner });
