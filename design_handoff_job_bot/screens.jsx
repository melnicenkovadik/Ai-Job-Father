// screens.jsx — all 11 screens, variant-aware via `style` prop

// `style` is a bundle of variant-specific render helpers supplied by each variant module:
//   style.Card, style.Pill, style.Button, style.Input, style.StatusBadge, style.CategoryChip,
//   style.Headline, style.SectionTitle, style.Meta, style.ProgressRing, style.Hero

function useNav(initial = 'dashboard') {
  const [stack, setStack] = React.useState([initial]);
  const [data, setData] = React.useState({});
  const cur = stack[stack.length - 1];
  return {
    cur, data,
    push: (s, d) => { setStack(x => [...x, s]); if (d) setData(p => ({...p, ...d})); },
    back: () => setStack(x => x.length > 1 ? x.slice(0, -1) : x),
    reset: (s) => setStack([s || 'dashboard']),
    set: (d) => setData(p => ({...p, ...d})),
  };
}

// ─────────────────────────────────────────────────────────────
// Onboarding / Welcome
// ─────────────────────────────────────────────────────────────
function ScrOnboarding({ pal, style, nav }) {
  const tok = style.tok;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 24, boxSizing: 'border-box' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
        {style.Hero ? style.Hero(pal) : (
          <div style={{
            width: 96, height: 96, borderRadius: tok.radius.xl, background: pal.accentBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon.Spark size={48} fill={pal.accent}/>
          </div>
        )}
        <div>
          {style.Headline('AI находит\nвакансии.\nВы получаете\nответы.', pal)}
          <div style={{ color: pal.textDim, fontSize: 16, lineHeight: 1.45, marginTop: 14 }}>
            Загрузите резюме → мы сами ищем по 12 категориям, сами откликаемся.
            Вы видите прогресс в реальном времени.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {[
            { icon: <Icon.Doc size={18} stroke={pal.accent}/>, t: 'AI-парсинг резюме', s: 'PDF или LinkedIn — заполним профиль' },
            { icon: <Icon.Search size={18} stroke={pal.accent}/>, t: 'Поиск по 12 категориям', s: 'Tech, Design, Product, Finance...' },
            { icon: <Icon.Star size={18} fill={pal.accent}/>, t: 'Оплата ⭐ Stars или TON', s: 'Без карт — нативно в Telegram' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: 12, borderRadius: tok.radius.md,
              background: pal.surface, border: `1px solid ${pal.border}`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: tok.radius.sm,
                background: pal.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{f.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: pal.text }}>{f.t}</div>
                <div style={{ fontSize: 13, color: pal.textDim, marginTop: 2 }}>{f.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <MainButton pal={pal} onClick={() => nav.push('upload')} radius={tok.radius.md}>
        Начать <Icon.Arrow size={18} stroke="#1a0f00"/>
      </MainButton>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard — list of campaigns with statuses
// ─────────────────────────────────────────────────────────────
function ScrDashboard({ pal, style, nav }) {
  const tok = style.tok;
  const active = MOCK_CAMPAIGNS.filter(c => ['searching','applying','running','paid'].includes(c.status));
  const draft = MOCK_CAMPAIGNS.filter(c => c.status === 'draft');
  const done = MOCK_CAMPAIGNS.filter(c => c.status === 'completed');

  return (
    <>
      <Body pal={pal} hasMainButton>
        {/* Greeting + summary */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: pal.textDim, fontSize: 14, marginBottom: 4 }}>Доброе утро, Вадим</div>
          {style.Headline('3 кампании', pal, { size: 'md' })}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
          {[
            { l: 'Найдено', v: '109', s: 'вакансий' },
            { l: 'Откликов', v: '42', s: 'отправлено' },
            { l: 'Ответов', v: '6', s: 'получено' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '12px 10px', borderRadius: tok.radius.md,
              background: pal.surface, border: `1px solid ${pal.border}`,
            }}>
              <div style={{ color: pal.textDim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontFamily: tok.fontMono, fontSize: 22, fontWeight: 600, color: pal.text, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 11, color: pal.textMute, marginTop: 2 }}>{s.s}</div>
            </div>
          ))}
        </div>

        {/* Active */}
        {active.length > 0 && <>
          {style.SectionTitle('Активные', pal)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {active.map(c => <CampaignCard key={c.id} c={c} pal={pal} style={style} onClick={() => nav.push('detail', { campaignId: c.id })}/>)}
          </div>
        </>}

        {/* Drafts */}
        {draft.length > 0 && <>
          {style.SectionTitle('Черновики', pal)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {draft.map(c => <CampaignCard key={c.id} c={c} pal={pal} style={style} onClick={() => nav.push('checkout', { campaignId: c.id })}/>)}
          </div>
        </>}

        {/* Completed */}
        {done.length > 0 && <>
          {style.SectionTitle('Завершённые', pal)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {done.map(c => <CampaignCard key={c.id} c={c} pal={pal} style={style} onClick={() => nav.push('detail', { campaignId: c.id })}/>)}
          </div>
        </>}

        {/* Tab bar placeholder */}
        <div style={{ height: 60 }}/>
      </Body>

      {/* Bottom tab bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 34,
        background: pal.bg2, borderTop: `1px solid ${pal.border}`,
        display: 'flex', justifyContent: 'space-around', padding: '8px 0 4px',
        zIndex: 30,
      }}>
        {[
          { k: 'dashboard', i: <Icon.Search size={22} stroke={pal.accent}/>, l: 'Кампании', active: true },
          { k: 'profile',   i: <Icon.User size={22} stroke={pal.textMute}/>, l: 'Профиль' },
          { k: 'settings',  i: <Icon.Settings size={22} stroke={pal.textMute}/>, l: 'Настройки' },
        ].map(t => (
          <button key={t.k} onClick={() => nav.push(t.k)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            color: t.active ? pal.accent : pal.textMute,
            fontSize: 10, fontFamily: 'inherit', padding: '4px 16px',
          }}>
            {t.i}
            <span>{t.l}</span>
          </button>
        ))}
      </div>

      {/* Floating new campaign button */}
      <button onClick={() => nav.push('wizard')} style={{
        position: 'absolute', right: 16, bottom: 110, zIndex: 35,
        width: 56, height: 56, borderRadius: tok.radius.full,
        border: 'none', cursor: 'pointer',
        background: pal.accent, color: '#1a0f00',
        boxShadow: `0 8px 24px ${pal.accent}55, 0 2px 6px rgba(0,0,0,0.2)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon.Plus size={26} stroke="#1a0f00" w={2.5}/>
      </button>
    </>
  );
}

function CampaignCard({ c, pal, style, onClick }) {
  const tok = style.tok;
  const st = STATUSES[c.status];
  const cat = CATEGORIES.find(x => x.id === c.category);
  const pct = c.progress.quota ? Math.round((c.progress.applied / c.progress.quota) * 100) : 0;

  return (
    <button onClick={onClick} style={{
      background: pal.surface, border: `1px solid ${pal.border}`,
      borderRadius: tok.radius.lg, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
      cursor: 'pointer', textAlign: 'left',
      fontFamily: 'inherit', color: pal.text,
      width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {style.CategoryChip(cat, pal)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: pal.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
          <div style={{ fontSize: 12, color: pal.textDim, marginTop: 2 }}>{c.countries.join(', ')} · {c.createdAt}</div>
        </div>
        {style.StatusBadge(st, pal)}
      </div>

      {c.status !== 'draft' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
            <span style={{ color: pal.textDim }}>
              <span style={{ fontFamily: tok.fontMono, color: pal.text, fontWeight: 600 }}>{c.progress.applied}</span>
              <span style={{ color: pal.textMute }}> / </span>
              <span style={{ fontFamily: tok.fontMono }}>{c.progress.quota}</span>
              <span style={{ color: pal.textMute }}> откликов</span>
            </span>
            <span style={{ fontFamily: tok.fontMono, color: pal.accent, fontWeight: 600 }}>{pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: pal.bg2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`, background: pal.accent,
              boxShadow: c.status !== 'completed' ? `0 0 12px ${pal.accent}` : 'none',
            }}/>
          </div>
        </div>
      )}

      {c.status === 'draft' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: pal.textDim }}>Требуется оплата</span>
          <span style={{ fontFamily: tok.fontMono, color: pal.accent, fontWeight: 600 }}>
            {c.price.currency === 'STARS' ? `${c.price.amount} ⭐` : `${c.price.amount} TON`}
          </span>
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Upload CV + AI parsing
// ─────────────────────────────────────────────────────────────
function ScrUpload({ pal, style, nav }) {
  const tok = style.tok;
  const [phase, setPhase] = React.useState('idle'); // idle | uploading | parsing | done

  React.useEffect(() => {
    if (phase === 'idle') return;
    if (phase === 'uploading') { const t = setTimeout(() => setPhase('parsing'), 1200); return () => clearTimeout(t); }
    if (phase === 'parsing') { const t = setTimeout(() => nav.push('review'), 2000); return () => clearTimeout(t); }
  }, [phase]);

  const steps = [
    { k: 'upload', l: 'Файл загружен', done: phase !== 'idle' && phase !== 'uploading', active: phase === 'uploading' },
    { k: 'extract', l: 'Извлекаем текст', done: phase === 'parsing' || phase === 'done', active: false },
    { k: 'ai', l: 'AI анализирует', done: phase === 'done', active: phase === 'parsing' },
    { k: 'profile', l: 'Готовим профиль', done: phase === 'done', active: false },
  ];

  return (
    <Body pal={pal} hasMainButton>
      {style.Headline('Резюме', pal, { size: 'md' })}
      <div style={{ color: pal.textDim, fontSize: 14, marginBottom: 24, marginTop: 6 }}>
        Загрузите PDF или вставьте ссылку на LinkedIn. AI заполнит профиль автоматически.
      </div>

      {phase === 'idle' && (
        <>
          <div style={{
            border: `2px dashed ${pal.borderHi}`, borderRadius: tok.radius.lg,
            padding: 32, textAlign: 'center',
            background: pal.surface,
          }} onClick={() => setPhase('uploading')}>
            <div style={{
              width: 64, height: 64, borderRadius: tok.radius.full, background: pal.accentBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Icon.Upload size={28} stroke={pal.accent}/>
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, color: pal.text }}>Перетащите CV или нажмите</div>
            <div style={{ fontSize: 12, color: pal.textDim, marginTop: 4 }}>PDF, DOC, DOCX · до 10 МБ</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: pal.border }}/>
            <span style={{ fontSize: 12, color: pal.textMute }}>или</span>
            <div style={{ flex: 1, height: 1, background: pal.border }}/>
          </div>
          <div style={{
            padding: 14, borderRadius: tok.radius.md,
            background: pal.surface, border: `1px solid ${pal.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon.Globe size={20} stroke={pal.textDim}/>
            <input placeholder="linkedin.com/in/..." style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              color: pal.text, fontSize: 14, fontFamily: 'inherit',
            }}/>
          </div>
        </>
      )}

      {phase !== 'idle' && (
        <div style={{
          padding: 20, borderRadius: tok.radius.lg,
          background: pal.surface, border: `1px solid ${pal.border}`,
        }}>
          <div style={{
            padding: 14, borderRadius: tok.radius.md,
            background: pal.bg2, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
          }}>
            <div style={{
              width: 36, height: 44, borderRadius: 4, background: pal.accentBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon.Doc size={18} stroke={pal.accent}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Melnychenko_CV.pdf</div>
              <div style={{ fontSize: 12, color: pal.textDim, fontFamily: tok.fontMono }}>248 КБ</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {steps.map((s, i) => (
              <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 12,
                  background: s.done ? pal.accent : (s.active ? pal.accentBg : pal.bg2),
                  border: !s.done && !s.active ? `1px solid ${pal.border}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {s.done && <Icon.Check size={14} stroke="#1a0f00" w={3}/>}
                  {s.active && <Spinner size={14} color={pal.accent}/>}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: s.active ? 600 : 500,
                  color: s.done ? pal.text : (s.active ? pal.accent : pal.textMute),
                }}>{s.l}</div>
              </div>
            ))}
          </div>

          {phase === 'parsing' && (
            <div style={{
              marginTop: 16, padding: 12, borderRadius: tok.radius.md,
              background: pal.accentBg, color: pal.accent, fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon.Spark size={14} fill={pal.accent}/>
              <span>Claude Sonnet 4.5 · извлекает опыт, стек, языки</span>
            </div>
          )}
        </div>
      )}

      {phase === 'idle' && (
        <MainButton pal={pal} onClick={() => setPhase('uploading')} radius={tok.radius.md}>
          <Icon.Upload size={18} stroke="#1a0f00"/> Загрузить резюме
        </MainButton>
      )}
    </Body>
  );
}

// ─────────────────────────────────────────────────────────────
// Profile Review (after AI parse)
// ─────────────────────────────────────────────────────────────
function ScrProfileReview({ pal, style, nav }) {
  const tok = style.tok;
  const p = MOCK_PROFILE;
  return (
    <>
      <Body pal={pal} hasMainButton>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: tok.radius.full,
          background: pal.accentBg, color: pal.accent,
          fontSize: 12, fontWeight: 600, marginBottom: 16,
          width: 'fit-content',
        }}>
          <Icon.Spark size={12} fill={pal.accent}/>
          AI заполнил профиль — проверьте
        </div>

        {style.Headline('Профиль', pal, { size: 'md' })}

        <div style={{
          marginTop: 14, padding: 16, borderRadius: tok.radius.lg,
          background: pal.surface, border: `1px solid ${pal.border}`,
        }}>
          <Field label="Имя" value={p.name} pal={pal} tok={tok}/>
          <Field label="Позиция" value={p.headline} pal={pal} tok={tok}/>
          <Field label="Локация" value={p.location} pal={pal} tok={tok}/>
          <Field label="Email" value={p.email} pal={pal} tok={tok} last/>
        </div>

        {style.SectionTitle('Навыки', pal, { mt: 20 })}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {p.skills.map(s => style.Pill(s, pal, { key: s }))}
          <button style={{
            padding: '6px 10px', borderRadius: tok.radius.full,
            background: 'transparent', border: `1px dashed ${pal.borderHi}`,
            color: pal.textDim, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 4,
          }}><Icon.Plus size={12} stroke={pal.textDim}/> ещё</button>
        </div>

        {style.SectionTitle('Опыт', pal, { mt: 20 })}
        <div style={{
          padding: 4, borderRadius: tok.radius.lg,
          background: pal.surface, border: `1px solid ${pal.border}`,
        }}>
          {p.experience.map((e, i) => (
            <div key={i} style={{
              padding: 12, borderBottom: i < p.experience.length - 1 ? `1px solid ${pal.border}` : 'none',
            }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{e.role}</div>
              <div style={{ fontSize: 13, color: pal.textDim, display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span>{e.co}</span>
                <span style={{ fontFamily: tok.fontMono, fontSize: 12 }}>{e.period}</span>
              </div>
            </div>
          ))}
        </div>

        {style.SectionTitle('Языки', pal, { mt: 20 })}
        <div style={{
          padding: 4, borderRadius: tok.radius.lg,
          background: pal.surface, border: `1px solid ${pal.border}`, marginBottom: 20,
        }}>
          {p.languages.map((l, i) => (
            <div key={i} style={{
              padding: '12px 14px', display: 'flex', justifyContent: 'space-between',
              borderBottom: i < p.languages.length - 1 ? `1px solid ${pal.border}` : 'none',
            }}>
              <div>
                <span style={{ fontFamily: tok.fontMono, fontSize: 11, color: pal.textMute, marginRight: 8 }}>{l.code}</span>
                <span style={{ fontSize: 14 }}>{l.label}</span>
              </div>
              <span style={{ fontSize: 13, color: pal.accent, fontWeight: 600 }}>{l.level}</span>
            </div>
          ))}
        </div>
      </Body>
      <MainButton pal={pal} onClick={() => nav.push('wizard')} radius={tok.radius.md}>
        Создать кампанию <Icon.Arrow size={18} stroke="#1a0f00"/>
      </MainButton>
    </>
  );
}

function Field({ label, value, pal, tok, last }) {
  return (
    <div style={{
      padding: '10px 0',
      borderBottom: last ? 'none' : `1px solid ${pal.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 13, color: pal.textDim }}>{label}</span>
      <span style={{ fontSize: 14, color: pal.text, textAlign: 'right', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Campaign Wizard (8 steps)
// ─────────────────────────────────────────────────────────────
function ScrWizard({ pal, style, nav }) {
  const tok = style.tok;
  const [step, setStep] = React.useState(0);
  const [draft, setDraft] = React.useState({
    category: 'tech',
    roles: ['Frontend Engineer', 'Senior Frontend Developer'],
    countries: ['DE', 'NL', 'PL'],
    salary: 5000,
    stack: ['React', 'TypeScript', 'Next.js'],
    languages: ['EN', 'DE'],
    quota: 30,
  });

  const price = 200 + draft.quota * 8 + draft.countries.length * 15;

  const next = () => {
    if (step < WIZARD_STEPS.length - 1) setStep(step + 1);
    else nav.push('checkout', { price, draft });
  };
  const prev = () => { if (step > 0) setStep(step - 1); else nav.back(); };

  return (
    <>
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {WIZARD_STEPS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? pal.accent : pal.bg2,
            }}/>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontFamily: tok.fontMono, fontSize: 11, color: pal.textMute, letterSpacing: 1 }}>
            ШАГ {String(step+1).padStart(2,'0')} / 08
          </span>
          <span style={{ fontFamily: tok.fontMono, fontSize: 13, color: pal.accent, fontWeight: 600 }}>
            {price} ⭐
          </span>
        </div>
      </div>

      <Body pal={pal} hasMainButton pad={16}>
        {style.Headline(WIZARD_STEPS[step], pal, { size: 'md' })}
        <div style={{ color: pal.textDim, fontSize: 13, marginTop: 6, marginBottom: 20 }}>
          {['Выберите категорию — определит форму и цену',
            'ESCO-роли · до 5 штук',
            'Где искать · мульти-выбор',
            'Минимальная зарплата',
            'Обязательный стек',
            'Языки собеседования',
            'Сколько откликов хотите · прямо влияет на цену',
            'Проверьте и оплатите'][step]}
        </div>

        {step === 0 && <StepCategory draft={draft} setDraft={setDraft} pal={pal} tok={tok} style={style}/>}
        {step === 1 && <StepRoles draft={draft} setDraft={setDraft} pal={pal} tok={tok} style={style}/>}
        {step === 2 && <StepCountries draft={draft} setDraft={setDraft} pal={pal} tok={tok} style={style}/>}
        {step === 3 && <StepSalary draft={draft} setDraft={setDraft} pal={pal} tok={tok} style={style}/>}
        {step === 4 && <StepStack draft={draft} setDraft={setDraft} pal={pal} tok={tok} style={style}/>}
        {step === 5 && <StepLanguages draft={draft} setDraft={setDraft} pal={pal} tok={tok} style={style}/>}
        {step === 6 && <StepQuota draft={draft} setDraft={setDraft} pal={pal} tok={tok} style={style}/>}
        {step === 7 && <StepSummary draft={draft} price={price} pal={pal} tok={tok} style={style}/>}
      </Body>

      <MainButton pal={pal} onClick={next} radius={tok.radius.md}>
        {step === 7 ? <>К оплате · {price} ⭐</> : <>Далее <Icon.Arrow size={18} stroke="#1a0f00"/></>}
      </MainButton>
    </>
  );
}

function StepCategory({ draft, setDraft, pal, tok, style }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {CATEGORIES.map(c => {
        const on = draft.category === c.id;
        return (
          <button key={c.id} onClick={() => setDraft({...draft, category: c.id})} style={{
            padding: '14px 12px', borderRadius: tok.radius.md,
            border: on ? `1.5px solid ${pal.accent}` : `1px solid ${pal.border}`,
            background: on ? pal.accentBg : pal.surface,
            color: pal.text, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 6,
              background: on ? pal.accent : pal.bg2, color: on ? '#1a0f00' : pal.text,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontFamily: tok.fontMono, fontWeight: 700,
            }}>{c.glyph}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function StepRoles({ draft, setDraft, pal, tok, style }) {
  const suggestions = ['Senior Frontend Developer', 'Full-stack Engineer', 'React Native Developer'];
  return (
    <div>
      <div style={{
        padding: 12, borderRadius: tok.radius.md,
        background: pal.surface, border: `1px solid ${pal.border}`,
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
      }}>
        <Icon.Search size={18} stroke={pal.textDim}/>
        <input placeholder="Введите роль..." style={{
          flex: 1, border: 'none', background: 'transparent', outline: 'none',
          color: pal.text, fontSize: 14, fontFamily: 'inherit',
        }}/>
      </div>
      <div style={{ fontSize: 12, color: pal.textDim, marginBottom: 8 }}>Выбрано · {draft.roles.length}/5</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {draft.roles.map(r => (
          <div key={r} style={{
            padding: '8px 12px', borderRadius: tok.radius.full,
            background: pal.accentBg, color: pal.accent,
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {r}
            <Icon.Close size={12} stroke={pal.accent}/>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: pal.textMute, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Подсказки ESCO</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {suggestions.map(s => (
          <button key={s} style={{
            padding: '10px 12px', borderRadius: tok.radius.sm,
            background: pal.surface, border: `1px solid ${pal.border}`,
            color: pal.text, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, textAlign: 'left',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {s}
            <Icon.Plus size={14} stroke={pal.textMute}/>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepCountries({ draft, setDraft, pal, tok, style }) {
  const quick = ['Any EU', 'Any Remote', 'DE', 'NL', 'PL', 'UK', 'US', 'UA', 'CZ', 'ES', 'FR', 'IT'];
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {quick.map(c => {
          const on = draft.countries.includes(c);
          return (
            <button key={c} onClick={() => setDraft({
              ...draft, countries: on ? draft.countries.filter(x => x !== c) : [...draft.countries, c]
            })} style={{
              padding: '8px 12px', borderRadius: tok.radius.full,
              background: on ? pal.accent : pal.surface,
              color: on ? '#1a0f00' : pal.text,
              border: on ? `1px solid ${pal.accent}` : `1px solid ${pal.border}`,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
            }}>{c}</button>
          );
        })}
      </div>

      <div style={{
        padding: 14, borderRadius: tok.radius.md,
        background: pal.surface, border: `1px solid ${pal.border}`,
      }}>
        <div style={{ fontSize: 12, color: pal.textDim, marginBottom: 8 }}>Формат работы</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Remote', 'Hybrid', 'Onsite'].map((m, i) => (
            <button key={m} style={{
              flex: 1, padding: '10px', borderRadius: tok.radius.sm,
              background: i === 0 ? pal.accentBg : pal.bg2,
              color: i === 0 ? pal.accent : pal.textDim,
              border: `1px solid ${i === 0 ? pal.accent : pal.border}`,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
            }}>{m}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepSalary({ draft, setDraft, pal, tok, style }) {
  return (
    <div>
      <div style={{
        padding: 24, borderRadius: tok.radius.lg,
        background: pal.surface, border: `1px solid ${pal.border}`,
        textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, color: pal.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Минимум, USD / месяц</div>
        <div style={{ fontFamily: tok.fontMono, fontSize: 48, fontWeight: 700, color: pal.text, letterSpacing: -1 }}>
          ${draft.salary.toLocaleString()}
        </div>
      </div>
      <input type="range" min={1000} max={15000} step={500} value={draft.salary}
        onChange={e => setDraft({...draft, salary: Number(e.target.value)})}
        style={{ width: '100%', accentColor: pal.accent }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: tok.fontMono, fontSize: 11, color: pal.textMute, marginTop: 6 }}>
        <span>$1k</span><span>$15k</span>
      </div>
      <label style={{
        marginTop: 20, padding: 12, borderRadius: tok.radius.md,
        background: pal.surface, border: `1px solid ${pal.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Можно договариваться</div>
          <div style={{ fontSize: 12, color: pal.textDim, marginTop: 2 }}>Рассматриваем и ниже</div>
        </div>
        <div style={{ width: 40, height: 24, borderRadius: 12, background: pal.accent, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, background: '#fff' }}/>
        </div>
      </label>
    </div>
  );
}

function StepStack({ draft, setDraft, pal, tok, style }) {
  const all = ['React', 'TypeScript', 'Next.js', 'Node.js', 'Vue', 'Python', 'GraphQL', 'PostgreSQL', 'Docker', 'AWS', 'Tailwind'];
  return (
    <div>
      <div style={{ fontSize: 12, color: pal.textDim, marginBottom: 8 }}>Отмеченные ★ — жёсткие требования</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {all.map(s => {
          const on = draft.stack.includes(s);
          return (
            <button key={s} onClick={() => setDraft({
              ...draft, stack: on ? draft.stack.filter(x => x !== s) : [...draft.stack, s]
            })} style={{
              padding: '8px 12px', borderRadius: tok.radius.full,
              background: on ? pal.accent : pal.surface,
              color: on ? '#1a0f00' : pal.text,
              border: on ? `1px solid ${pal.accent}` : `1px solid ${pal.border}`,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {on && <Icon.Star size={11} fill="#1a0f00"/>}
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepLanguages({ draft, setDraft, pal, tok, style }) {
  const langs = [
    { code: 'EN', label: 'Английский' },
    { code: 'DE', label: 'Немецкий' },
    { code: 'FR', label: 'Французский' },
    { code: 'ES', label: 'Испанский' },
    { code: 'PL', label: 'Польский' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {langs.map(l => {
        const on = draft.languages.includes(l.code);
        return (
          <button key={l.code} onClick={() => setDraft({
            ...draft, languages: on ? draft.languages.filter(x => x !== l.code) : [...draft.languages, l.code]
          })} style={{
            padding: 14, borderRadius: tok.radius.md,
            background: pal.surface, border: `1px solid ${on ? pal.accent : pal.border}`,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6,
              background: pal.bg2, color: pal.textDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: tok.fontMono, fontSize: 12, fontWeight: 700,
            }}>{l.code}</div>
            <span style={{ flex: 1, fontSize: 14, color: pal.text, textAlign: 'left' }}>{l.label}</span>
            {on && <div style={{
              width: 22, height: 22, borderRadius: 11, background: pal.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon.Check size={12} stroke="#1a0f00" w={3}/></div>}
          </button>
        );
      })}
    </div>
  );
}

function StepQuota({ draft, setDraft, pal, tok, style }) {
  return (
    <div>
      <div style={{
        padding: 24, borderRadius: tok.radius.lg,
        background: pal.surface, border: `1px solid ${pal.border}`,
        textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, color: pal.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Квота откликов</div>
        <div style={{ fontFamily: tok.fontMono, fontSize: 64, fontWeight: 700, color: pal.accent, letterSpacing: -2, lineHeight: 1 }}>
          {draft.quota}
        </div>
        <div style={{ fontSize: 13, color: pal.textDim, marginTop: 8 }}>≈ {draft.quota * 3}–{draft.quota * 5} вакансий просмотрено</div>
      </div>
      <input type="range" min={10} max={100} step={5} value={draft.quota}
        onChange={e => setDraft({...draft, quota: Number(e.target.value)})}
        style={{ width: '100%', accentColor: pal.accent }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: tok.fontMono, fontSize: 11, color: pal.textMute, marginTop: 6 }}>
        <span>10</span><span>100</span>
      </div>
      <div style={{
        marginTop: 20, padding: 14, borderRadius: tok.radius.md,
        background: pal.accentBg, color: pal.accent, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Icon.Spark size={14} fill={pal.accent}/>
        <span>Цена растёт линейно: 200 ⭐ базово + 8 ⭐ за каждый отклик</span>
      </div>
    </div>
  );
}

function StepSummary({ draft, price, pal, tok, style }) {
  const cat = CATEGORIES.find(c => c.id === draft.category);
  const rows = [
    ['Категория', cat.label],
    ['Роли', `${draft.roles.length} шт.`],
    ['Страны', draft.countries.join(', ')],
    ['Зарплата', `$${draft.salary.toLocaleString()}+`],
    ['Стек', draft.stack.join(', ')],
    ['Языки', draft.languages.join(', ')],
    ['Квота откликов', `${draft.quota}`],
  ];
  return (
    <>
      <div style={{
        padding: 16, borderRadius: tok.radius.lg,
        background: pal.surface, border: `1px solid ${pal.border}`,
      }}>
        {rows.map(([l, v], i) => (
          <div key={l} style={{
            padding: '10px 0', borderBottom: i < rows.length - 1 ? `1px solid ${pal.border}` : 'none',
            display: 'flex', justifyContent: 'space-between', gap: 10,
          }}>
            <span style={{ fontSize: 13, color: pal.textDim }}>{l}</span>
            <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16, padding: 16, borderRadius: tok.radius.lg,
        background: pal.accentBg, border: `1px solid ${pal.accent}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13, color: pal.text }}>
          <span>Базовая цена</span><span style={{ fontFamily: tok.fontMono }}>200 ⭐</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13, color: pal.text }}>
          <span>Квота × {draft.quota}</span><span style={{ fontFamily: tok.fontMono }}>{draft.quota * 8} ⭐</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 13, color: pal.text }}>
          <span>Страны × {draft.countries.length}</span><span style={{ fontFamily: tok.fontMono }}>{draft.countries.length * 15} ⭐</span>
        </div>
        <div style={{ height: 1, background: pal.accent, opacity: 0.3, marginBottom: 14 }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: pal.text }}>К оплате</span>
          <span style={{ fontFamily: tok.fontMono, fontSize: 24, fontWeight: 700, color: pal.accent }}>{price} ⭐</span>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Checkout — Stars vs TON choice
// ─────────────────────────────────────────────────────────────
function ScrCheckout({ pal, style, nav }) {
  const tok = style.tok;
  const [method, setMethod] = React.useState('stars');
  const price = nav.data.price || 490;

  return (
    <>
      <Body pal={pal} hasMainButton>
        {style.Headline('Оплата', pal, { size: 'md' })}
        <div style={{ color: pal.textDim, fontSize: 13, marginTop: 6, marginBottom: 20 }}>
          После оплаты данные кампании фиксируются и передаются в поиск.
        </div>

        <div style={{
          padding: 20, borderRadius: tok.radius.lg,
          background: pal.surface, border: `1px solid ${pal.border}`, marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, color: pal.textDim, marginBottom: 6 }}>Senior Frontend Engineer · 30 откликов</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: tok.fontMono, fontSize: 36, fontWeight: 700, color: pal.text, letterSpacing: -1 }}>
              {method === 'stars' ? price : (price * 0.004).toFixed(2)}
            </span>
            <span style={{ fontSize: 16, color: pal.accent, fontWeight: 600 }}>
              {method === 'stars' ? '⭐ Stars' : 'TON'}
            </span>
          </div>
          {method === 'ton' && (
            <div style={{ fontSize: 12, color: pal.textMute, marginTop: 4, fontFamily: tok.fontMono }}>
              ≈ ${(price * 0.004 * 6).toFixed(2)} USD
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: pal.textMute, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Способ оплаты</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <PayMethod
            active={method === 'stars'}
            onClick={() => setMethod('stars')}
            pal={pal} tok={tok}
            icon={<div style={{ fontSize: 28 }}>⭐</div>}
            title="Telegram Stars"
            sub="Нативная оплата · мгновенно"
            badge="Рекомендуем"
          />
          <PayMethod
            active={method === 'ton'}
            onClick={() => setMethod('ton')}
            pal={pal} tok={tok}
            icon={<Icon.Ton size={28}/>}
            title="TON Connect"
            sub="Оплата через крипто-кошелёк"
          />
        </div>

        <div style={{
          padding: 12, borderRadius: tok.radius.md,
          background: pal.bg2, color: pal.textDim, fontSize: 12,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <Icon.Alert size={14} stroke={pal.textDim}/>
          <span>После оплаты данные кампании не редактируются. Возврат средств в MVP не предусмотрен.</span>
        </div>
      </Body>
      <MainButton pal={pal} onClick={() => nav.push('payment', { method, price })} radius={tok.radius.md}>
        Оплатить {method === 'stars' ? `${price} ⭐` : `${(price * 0.004).toFixed(2)} TON`}
      </MainButton>
    </>
  );
}

function PayMethod({ active, onClick, pal, tok, icon, title, sub, badge }) {
  return (
    <button onClick={onClick} style={{
      padding: 14, borderRadius: tok.radius.lg,
      background: active ? pal.accentBg : pal.surface,
      border: `1.5px solid ${active ? pal.accent : pal.border}`,
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: tok.radius.sm,
        background: pal.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: pal.text }}>{title}</span>
          {badge && <span style={{
            padding: '2px 6px', borderRadius: 4,
            background: pal.accent, color: '#1a0f00',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3,
          }}>{badge}</span>}
        </div>
        <div style={{ fontSize: 12, color: pal.textDim, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{
        width: 22, height: 22, borderRadius: 11,
        border: `1.5px solid ${active ? pal.accent : pal.borderHi}`,
        background: active ? pal.accent : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {active && <Icon.Check size={12} stroke="#1a0f00" w={3}/>}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Payment in progress + success / fail
// ─────────────────────────────────────────────────────────────
function ScrPayment({ pal, style, nav }) {
  const tok = style.tok;
  const [phase, setPhase] = React.useState('processing'); // processing | success | fail
  const method = nav.data.method || 'stars';
  const price = nav.data.price || 490;

  React.useEffect(() => {
    const t = setTimeout(() => setPhase('success'), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Body pal={pal} hasMainButton>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 20, padding: 24, minHeight: 500 }}>
          {phase === 'processing' && (
            <>
              <div style={{
                width: 120, height: 120, borderRadius: 60,
                background: pal.accentBg, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ position: 'absolute', inset: -4, borderRadius: 62, border: `3px solid ${pal.accent}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}/>
                <div style={{ fontSize: 52 }}>{method === 'stars' ? '⭐' : ''}</div>
                {method === 'ton' && <Icon.Ton size={52}/>}
              </div>
              {style.Headline('Ожидаем\nоплату', pal, { align: 'center' })}
              <div style={{ color: pal.textDim, fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
                {method === 'stars' ? 'Подтвердите в окне Telegram' : 'Подтвердите транзакцию в кошельке'}
              </div>
              <div style={{ fontFamily: tok.fontMono, fontSize: 14, color: pal.textMute, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: pal.success, animation: 'pulse 1.2s ease-in-out infinite' }}/>
                SECURE · {method === 'stars' ? 'TELEGRAM' : 'TON NETWORK'}
              </div>
            </>
          )}

          {phase === 'success' && (
            <>
              <div style={{
                width: 120, height: 120, borderRadius: 60,
                background: pal.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'fadeUp 0.4s ease-out',
              }}>
                <Icon.Check size={56} stroke="#1a0f00" w={3}/>
              </div>
              {style.Headline('Оплачено', pal, { align: 'center' })}
              <div style={{ color: pal.textDim, fontSize: 15, textAlign: 'center' }}>
                Кампания запущена. Первые отклики за 2–6 часов.
              </div>
              <div style={{
                padding: 14, borderRadius: tok.radius.md, background: pal.surface,
                border: `1px solid ${pal.border}`, width: '100%',
                display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13,
              }}>
                <Row l="Сумма" v={`${method === 'stars' ? `${price} ⭐` : `${(price*0.004).toFixed(2)} TON`}`} pal={pal} mono={tok.fontMono}/>
                <Row l="Транзакция" v={method === 'stars' ? 'tg_pmt_7a2f91' : 'EQCd2...7kJ'} pal={pal} mono={tok.fontMono}/>
                <Row l="Время" v="14 апр · 09:41" pal={pal} mono={tok.fontMono}/>
              </div>
            </>
          )}
        </div>
      </Body>
      {phase === 'success' && (
        <MainButton pal={pal} onClick={() => nav.reset('dashboard')} radius={tok.radius.md}>
          К кампаниям
        </MainButton>
      )}
    </>
  );
}

function Row({ l, v, pal, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: pal.textDim }}>{l}</span>
      <span style={{ fontFamily: mono, color: pal.text }}>{v}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Campaign Detail — snapshot + live events
// ─────────────────────────────────────────────────────────────
function ScrDetail({ pal, style, nav }) {
  const tok = style.tok;
  const c = MOCK_CAMPAIGNS[0];
  const st = STATUSES[c.status];
  const cat = CATEGORIES.find(x => x.id === c.category);
  const pct = Math.round((c.progress.applied / c.progress.quota) * 100);

  return (
    <Body pal={pal}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {style.CategoryChip(cat, pal)}
        {style.StatusBadge(st, pal)}
      </div>
      {style.Headline(c.title, pal, { size: 'md' })}
      <div style={{ color: pal.textDim, fontSize: 13, marginTop: 4, marginBottom: 20 }}>
        id · <span style={{ fontFamily: tok.fontMono }}>{c.id}</span> · оплачено {c.paidAt}
      </div>

      {/* Big stat */}
      <div style={{
        padding: 20, borderRadius: tok.radius.lg,
        background: pal.surface, border: `1px solid ${pal.border}`,
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 12 }}>
          <span style={{ fontFamily: tok.fontMono, fontSize: 44, fontWeight: 700, color: pal.text, letterSpacing: -1, lineHeight: 1 }}>{c.progress.applied}</span>
          <span style={{ fontFamily: tok.fontMono, fontSize: 20, color: pal.textMute, marginBottom: 4 }}>/ {c.progress.quota}</span>
          <div style={{ flex: 1 }}/>
          <span style={{ fontFamily: tok.fontMono, fontSize: 18, color: pal.accent, fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: pal.bg2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pal.accent, boxShadow: `0 0 16px ${pal.accent}` }}/>
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: pal.textDim }}>
          <span>Отклики отправлены</span>
          <span style={{ color: pal.accent, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: pal.accent, animation: 'pulse 1.5s ease-in-out infinite' }}/>
            живой поиск
          </span>
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[
          { l: 'Найдено', v: c.progress.found, s: 'вакансий' },
          { l: 'Ответов', v: '3', s: 'получено' },
        ].map(m => (
          <div key={m.l} style={{
            padding: 14, borderRadius: tok.radius.md,
            background: pal.surface, border: `1px solid ${pal.border}`,
          }}>
            <div style={{ fontSize: 11, color: pal.textDim, textTransform: 'uppercase', letterSpacing: 0.4 }}>{m.l}</div>
            <div style={{ fontFamily: tok.fontMono, fontSize: 26, fontWeight: 600, color: pal.text, marginTop: 4, lineHeight: 1 }}>{m.v}</div>
            <div style={{ fontSize: 11, color: pal.textMute, marginTop: 2 }}>{m.s}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {style.SectionTitle('Лента событий', pal)}
      <div style={{
        padding: 4, borderRadius: tok.radius.lg,
        background: pal.surface, border: `1px solid ${pal.border}`, marginBottom: 20,
      }}>
        {c.events.map((e, i) => (
          <div key={i} style={{
            padding: '12px 14px', display: 'flex', gap: 12,
            borderBottom: i < c.events.length - 1 ? `1px solid ${pal.border}` : 'none',
          }}>
            <div style={{ fontFamily: tok.fontMono, fontSize: 11, color: pal.textMute, width: 36, flexShrink: 0, paddingTop: 2 }}>{e.t}</div>
            <div style={{
              width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0,
              background: e.kind === 'applied' ? pal.accent : e.kind === 'paid' ? pal.success : pal.textMute,
            }}/>
            <div style={{ fontSize: 13, color: pal.text }}>{e.text}</div>
          </div>
        ))}
      </div>

      {/* Snapshot */}
      {style.SectionTitle('Снэпшот кампании', pal)}
      <div style={{
        padding: 4, borderRadius: tok.radius.lg,
        background: pal.surface, border: `1px solid ${pal.border}`,
        fontFamily: tok.fontMono, fontSize: 11,
      }}>
        {[
          ['category', '"tech"'],
          ['roles', '["senior_frontend", "fullstack"]'],
          ['countries', '["DE","NL","PL","UA"]'],
          ['salary_min', '5000'],
          ['quota', '50'],
          ['schema_version', '1'],
        ].map(([k, v], i, a) => (
          <div key={k} style={{
            padding: '10px 14px', display: 'flex', justifyContent: 'space-between', gap: 10,
            borderBottom: i < a.length - 1 ? `1px solid ${pal.border}` : 'none',
          }}>
            <span style={{ color: pal.textMute }}>{k}</span>
            <span style={{ color: pal.text, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
          </div>
        ))}
      </div>
    </Body>
  );
}

// ─────────────────────────────────────────────────────────────
// Profiles Manager
// ─────────────────────────────────────────────────────────────
function ScrProfiles({ pal, style, nav }) {
  const tok = style.tok;
  const profiles = [
    { name: 'Frontend / Senior', headline: 'React · TypeScript · 7 лет', default: true, campaigns: 2 },
    { name: 'Fullstack / Web3', headline: 'Node.js · Solidity · 4 года', default: false, campaigns: 1 },
  ];
  return (
    <>
      <Body pal={pal} hasMainButton>
        {style.Headline('Профили', pal, { size: 'md' })}
        <div style={{ color: pal.textDim, fontSize: 13, marginTop: 6, marginBottom: 20 }}>
          Разные роли — разные профили. Один по умолчанию.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {profiles.map((p, i) => (
            <div key={i} style={{
              padding: 16, borderRadius: tok.radius.lg,
              background: pal.surface, border: `1px solid ${p.default ? pal.accent : pal.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: tok.radius.full,
                  background: pal.accentBg, color: pal.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>{p.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
                    {p.default && <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: pal.accent, color: '#1a0f00', textTransform: 'uppercase', letterSpacing: 0.4,
                    }}>DEFAULT</span>}
                  </div>
                  <div style={{ fontSize: 13, color: pal.textDim, marginTop: 2 }}>{p.headline}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: pal.textMute, paddingTop: 8, borderTop: `1px solid ${pal.border}` }}>
                <span>{p.campaigns} кампаний</span>
                <span style={{ color: pal.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>Править <Icon.ChevronRight size={12} stroke={pal.accent}/></span>
              </div>
            </div>
          ))}
        </div>
      </Body>
      <MainButton pal={pal} variant="outline" onClick={() => nav.push('upload')} radius={tok.radius.md}>
        <Icon.Plus size={18} stroke={pal.accent}/> Новый профиль
      </MainButton>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Settings / locale
// ─────────────────────────────────────────────────────────────
function ScrSettings({ pal, style, nav }) {
  const tok = style.tok;
  const langs = [
    { c: 'ru', l: 'Русский', flag: 'RU' },
    { c: 'en', l: 'English', flag: 'EN' },
    { c: 'uk', l: 'Українська', flag: 'UA' },
    { c: 'it', l: 'Italiano', flag: 'IT' },
    { c: 'pl', l: 'Polski', flag: 'PL' },
  ];
  return (
    <Body pal={pal}>
      {style.Headline('Настройки', pal, { size: 'md' })}
      <div style={{ marginTop: 24 }}>
        {style.SectionTitle('Язык', pal)}
        <div style={{
          padding: 4, borderRadius: tok.radius.lg,
          background: pal.surface, border: `1px solid ${pal.border}`,
        }}>
          {langs.map((l, i) => (
            <div key={l.c} style={{
              padding: '14px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i < langs.length - 1 ? `1px solid ${pal.border}` : 'none',
              cursor: 'pointer',
            }}>
              <div style={{
                width: 28, height: 20, borderRadius: 3, background: pal.bg2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, fontFamily: tok.fontMono, color: pal.textDim,
              }}>{l.flag}</div>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{l.l}</span>
              {l.c === 'ru' && <Icon.Check size={18} stroke={pal.accent} w={2.5}/>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        {style.SectionTitle('Уведомления', pal)}
        <div style={{
          padding: 4, borderRadius: tok.radius.lg,
          background: pal.surface, border: `1px solid ${pal.border}`,
        }}>
          {[
            ['Новые отклики', true],
            ['Завершение кампании', true],
            ['Обновления статуса', false],
          ].map(([t, on], i, a) => (
            <div key={t} style={{
              padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: i < a.length - 1 ? `1px solid ${pal.border}` : 'none',
            }}>
              <span style={{ fontSize: 15 }}>{t}</span>
              <div style={{
                width: 40, height: 24, borderRadius: 12,
                background: on ? pal.accent : pal.bg2, position: 'relative', flexShrink: 0,
                border: on ? 'none' : `1px solid ${pal.border}`,
                transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: 2, left: on ? 18 : 2,
                  width: 20, height: 20, borderRadius: 10, background: '#fff',
                  transition: 'left 0.2s',
                }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24, marginBottom: 20 }}>
        {style.SectionTitle('О приложении', pal)}
        <div style={{
          padding: 4, borderRadius: tok.radius.lg,
          background: pal.surface, border: `1px solid ${pal.border}`,
        }}>
          {[
            ['Версия', 'MVP 0.1.0'],
            ['Поддержка', '@jobbot_help'],
            ['Условия', 'Открыть'],
          ].map(([l, v], i, a) => (
            <div key={l} style={{
              padding: '14px', display: 'flex', justifyContent: 'space-between',
              borderBottom: i < a.length - 1 ? `1px solid ${pal.border}` : 'none',
            }}>
              <span style={{ fontSize: 14, color: pal.textDim }}>{l}</span>
              <span style={{ fontSize: 14, fontFamily: l === 'Версия' ? tok.fontMono : 'inherit', color: pal.text }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </Body>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state / Error
// ─────────────────────────────────────────────────────────────
function ScrEmpty({ pal, style, nav }) {
  const tok = style.tok;
  return (
    <Body pal={pal} hasMainButton>
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', textAlign: 'center',
        padding: 24, minHeight: 500, gap: 16,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 40, background: pal.accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.Alert size={40} stroke={pal.accent}/>
        </div>
        {style.Headline('Оплата не\nпрошла', pal, { align: 'center' })}
        <div style={{ color: pal.textDim, fontSize: 14, maxWidth: 260 }}>
          Средства не списаны. Кампания осталась в черновиках — попробуйте снова.
        </div>
        <div style={{
          padding: 12, borderRadius: tok.radius.md,
          background: pal.surface, border: `1px solid ${pal.border}`,
          fontFamily: tok.fontMono, fontSize: 11, color: pal.textDim, width: '100%',
        }}>
          error · INVOICE_TIMEOUT<br/>
          <span style={{ color: pal.textMute }}>wallet did not respond in 60s</span>
        </div>
      </div>
      <MainButton pal={pal} onClick={() => nav.reset('dashboard')} radius={tok.radius.md}>
        Вернуться к кампаниям
      </MainButton>
    </Body>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen routing
// ─────────────────────────────────────────────────────────────
const SCREENS = {
  onboarding: { title: 'AI Job Bot',    C: ScrOnboarding },
  dashboard:  { title: 'Мои кампании',  C: ScrDashboard },
  upload:     { title: 'Новое резюме',  C: ScrUpload },
  review:     { title: 'Профиль',       C: ScrProfileReview },
  wizard:     { title: 'Кампания',      C: ScrWizard },
  checkout:   { title: 'Оплата',        C: ScrCheckout },
  payment:    { title: 'Оплата',        C: ScrPayment },
  detail:     { title: 'Кампания',      C: ScrDetail },
  profile:    { title: 'Профили',       C: ScrProfiles },
  settings:   { title: 'Настройки',     C: ScrSettings },
  empty:      { title: 'Ошибка',        C: ScrEmpty },
};

Object.assign(window, { SCREENS, useNav });
