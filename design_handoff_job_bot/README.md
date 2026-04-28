# Handoff: Job Bot — Telegram Mini App (Minimal variant)

## Overview

AI-powered Telegram bot and Mini App для автоматического поиска работы и подачи откликов.
Пользователь загружает резюме → AI парсит → создаёт кампанию через 8-шаговый визард → платит ⭐ Stars или TON → получает отклики в реальном времени.

**В этом пакете:** финальный Minimal-вариант дизайна (11 экранов) + полноценный кликабельный HTML-прототип.

## About the Design Files

Файлы в этом бандле — **дизайн-референсы, сделанные на HTML/React через `<script type="text/babel">`**. Это прототип, показывающий задуманный внешний вид и поведение, **не production-код**.

Задача — **воспроизвести этот дизайн в целевой кодовой базе** (например, React + TypeScript для Telegram Mini App через [`@telegram-apps/sdk`](https://github.com/Telegram-Mini-Apps/telegram-apps)) с использованием её установленных паттернов и библиотек. Если окружения ещё нет — рекомендую:

- **Vite + React + TypeScript**
- **`@telegram-apps/sdk-react`** для интеграции с Telegram (MainButton, BackButton, theme, HapticFeedback)
- **CSS variables** для токенов дизайна (легко мапится на `var(--tg-theme-*)` от Telegram)
- **React Router** или `useState`-стек для навигации между экранами
- **`@tonconnect/ui-react`** для TON payments

## Fidelity

**High-fidelity.** Все цвета, типографика, отступы, радиусы, иконки и поведение зафиксированы. Разработчику нужно воспроизвести UI пиксель-в-пиксель, подставив настоящие данные и интеграции.

## Design Tokens

### Цвета (Minimal · Dark — основная тема)

```css
--bg:          #0B0B0E;      /* основной фон приложения */
--bg-2:        #121218;      /* поверхность 2-го уровня */
--surface:     #17171F;      /* карточки */
--surface-hi:  #1E1E27;      /* активная карточка */
--border:      rgba(255,255,255,0.06);
--border-hi:   rgba(255,255,255,0.12);
--text:        #F2F1EC;
--text-dim:    rgba(242,241,236,0.60);
--text-mute:   rgba(242,241,236,0.35);

--accent:      oklch(76% 0.18 65);   /* amber 400 — все CTA, ссылки, активные индикаторы */
--accent-bg:   rgba(230,145,60,0.10); /* фон под accent-элементами */
--success:     oklch(76% 0.15 155);
--warn:        oklch(76% 0.18 65);
--danger:      oklch(65% 0.2 22);

--tg-header-bg:   #17212B;  /* Telegram-нативный header */
--tg-header-text: #fff;
```

### Цвета (Minimal · Light)

```css
--bg:          #FAFAF7;
--bg-2:        #F3F2EE;
--surface:     #FFFFFF;
--border:      rgba(20,15,10,0.08);
--border-hi:   rgba(20,15,10,0.14);
--text:        #14110C;
--text-dim:    rgba(20,17,12,0.60);
--text-mute:   rgba(20,17,12,0.38);
--accent:      oklch(62% 0.19 55);   /* amber 600 */
--accent-bg:   oklch(97% 0.03 70);
--tg-header-bg:   #527DA3;
```

### Типографика

| Роль       | Шрифт                | Размеры                        |
|------------|----------------------|--------------------------------|
| Sans       | **Inter**            | 11–16px UI, 600 для заголовков |
| Mono       | **JetBrains Mono**   | 11–44px для всех цифр, id, статусов |
| Display    | Inter 700            | 28–54px для headlines          |

**Важно:** все числовые значения (счётчики, цены, ID, прогресс %) рендерятся моно-шрифтом — это визуальная подпись всей системы.

### Шкала радиусов

```
sm: 8px    — chips, small buttons
md: 12px   — inputs, secondary cards
lg: 16px   — main cards, modals
xl: 20px   — hero surfaces
full: 9999 — pills, avatars
```

### Отступы

Сетка 4px. Основные значения: 4, 6, 8, 10, 12, 14, 16, 20, 24, 32.

### Анимации

- `0.2s ease` — hover, toggle
- `0.4s ease-out` — появление success-состояний
- `1.2s ease-in-out infinite` — `pulse` (живой индикатор live search)
- `1s linear infinite` — `spin` (processing spinner)

### Кривые

```css
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes spin  { to { transform: rotate(360deg) } }
@keyframes fadeUp { from { opacity:0; transform: translateY(10px) } to { opacity:1; transform: translateY(0) } }
```

## Screens / Views

### 01. Onboarding (`ScrOnboarding`)
- **Цель:** первое знакомство с ботом
- **Layout:** full-height column, центрированный hero (96×96 круглый chip с Spark-иконкой), headline в 4 строки («AI находит / вакансии. / Вы получаете / ответы.»), поясняющий текст, 3 feature-карточки (32×32 chip + заголовок + подзаголовок), sticky MainButton «Начать →»
- **Headline:** 34px, 700, `letter-spacing: -0.8px`, `line-height: 1.1`, `white-space: pre-line`

### 02. Dashboard (`ScrDashboard`)
- **Цель:** список кампаний с live-статусами
- **Layout:**
  - Приветствие («Доброе утро, Вадим») + счётчик кампаний (28px headline)
  - Строка из 3 stats (`Найдено` / `Откликов` / `Ответов`), цифры моно-шрифтом 22px
  - 3 секции: `Активные`, `Черновики`, `Завершённые`
  - **Bottom tab bar** (фиксированный, 60px high, над safe-area): Кампании / Профиль / Настройки
  - **FAB** `+` 56×56 amber, `box-shadow: 0 8px 24px accent55` — создать кампанию
- **CampaignCard:** 14px padding, `radius: 16`, border; верх — CategoryChip 36×36 + title + subtitle + StatusBadge; прогресс-бар 4px с amber-glow если running

### 03. Upload CV (`ScrUpload`)
- **Цель:** загрузка PDF или LinkedIn URL
- **State machine:** `idle → uploading → parsing → done` (таймеры 1200ms / 2000ms для демо)
- **idle:** dashed dropzone `2px dashed border-hi`, 64×64 accent chip, subtitle + альтернатива (LinkedIn input с globe-icon)
- **uploading/parsing:** карточка с файл-tile (36×44 doc preview) + 4-шаговый чеклист со спиннером на активном шаге; в конце amber-инфо «Claude Sonnet 4.5 · извлекает опыт, стек, языки»

### 04. Profile Review (`ScrProfileReview`)
- **Цель:** проверка AI-заполненного профиля перед запуском кампании
- **Top:** amber pill «AI заполнил профиль — проверьте» с Spark-иконкой
- **Sections:** Field-rows (Имя / Позиция / Локация / Email), Skills (pills + dashed «ещё»), Experience (4 записи, моно-период справа), Languages (код-тайл 32×32 + лейбл + уровень справа amber)

### 05. Campaign Wizard (`ScrWizard`)
- **Цель:** 8-шаговый визард с динамической ценой
- **Top:** прогресс-бары (по 1 на шаг, amber если пройден), «ШАГ 01 / 08» моно + текущая цена `{price} ⭐` amber
- **Шаги:**
  1. Category — 2-колонка grid 12 категорий, glyph 28×28 моно + label
  2. Roles — input + chips выбранных + подсказки ESCO
  3. Countries — quick-chips (DE/NL/PL/UK/...) + Work mode (Remote/Hybrid/Onsite)
  4. Salary — 48px моно-цифра + range slider + toggle «Можно договариваться»
  5. Stack — technology chips с ★ если обязательный
  6. Languages — список с 32×32 code-tile и check-indicator
  7. Quota — 64px amber моно-цифра + slider 10–100, формула цены
  8. Summary — table параметров + amber-карточка цены (breakdown → total 24px моно)
- **Формула цены:** `200 + quota × 8 + countries.length × 15`

### 06. Checkout (`ScrCheckout`)
- **Цель:** выбор метода оплаты (Stars vs TON)
- **Price display:** 36px моно + единица (⭐ Stars / TON), при TON показываем `≈ $USD` пересчёт
- **2 PayMethod карточки:** 44×44 icon-tile + title + sub + radio 22×22; Stars имеет badge «Рекомендуем» amber
- **Bottom disclaimer:** про невозврат

### 07. Payment (`ScrPayment`)
- **State:** `processing → success`
- **Processing:** 120×120 accent-bg круг + анимированный ring-border (`animation: spin 1s linear infinite`), crypto/stars иконка 52px, headline «Ожидаем оплату», live-indicator (зелёная пульсирующая точка + «SECURE · TELEGRAM» моно)
- **Success:** 120×120 amber круг (`animation: fadeUp 0.4s`), 56px check-icon, headline «Оплачено», receipt-card (сумма / транзакция / время) моно

### 08. Campaign Detail (`ScrDetail`)
- **Цель:** мониторинг активной кампании
- **Top:** CategoryChip + StatusBadge, title 28px, `id · монохэш · оплачено Xч`
- **Big stat card:** 44px моно цифра `X / Y`, прогресс-бар 6px с amber-glow, «живой поиск» индикатор (пульс)
- **Metrics grid 2×1:** Найдено / Ответов
- **Timeline:** список событий (время моно + dot + текст), dot amber/success/mute по типу
- **Snapshot:** моно-карточка JSON с immutable параметрами кампании

### 09. Profiles (`ScrProfiles`)
- **Цель:** управление несколькими профилями (под разные роли)
- **Card:** 40×40 avatar amber-chip + name + «DEFAULT» badge + headline + footer «X кампаний · Править →»
- **Bottom:** outline MainButton `+ Новый профиль`

### 10. Settings (`ScrSettings`)
- **Sections:** Язык (5 options — RU/EN/UK/IT/PL с flag-tiles, check справа на активной), Уведомления (3 toggles), О приложении (версия / поддержка / условия)

### 11. Empty / Error (`ScrEmpty`)
- **Цель:** fallback при fail-оплате
- **Center:** 80×80 alert chip, headline «Оплата не прошла», disclaimer, моно error-карточка `error · INVOICE_TIMEOUT`

## Interactions & Behavior

### Навигация

Стек экранов через `useNav` — `push / back / reset`. Все карточки на Dashboard кликабельны и ведут в Detail или Checkout в зависимости от статуса. FAB → wizard. Bottom tabs → переключение верхнего экрана (dashboard / profile / settings).

### MainButton pattern

В Telegram Mini App используется **нативная** `tg.MainButton` — но в дизайне я нарисовал её поверх контента (sticky bottom, amber, 54px высотой, `radius: 12`). В целевой реализации:
1. Внутри Mini App — вызывать `tg.MainButton.setText(...)`, `.show()`, `.onClick(...)` через SDK
2. В web-fallback (для разработки вне Telegram) — рендерить как фиксированную кнопку
3. BackButton в header — тоже нативный Telegram API

### Telegram нативные вещи

- **Theme sync:** слушать `window.Telegram.WebApp.colorScheme` и `themeParams`, мапить на `--tg-theme-*` CSS vars
- **Haptic:** на важные действия (оплата, success) — `HapticFeedback.impactOccurred('light'|'medium')`
- **Close confirmation:** `enableClosingConfirmation()` если пользователь в середине wizard'а
- **Payments:** `openInvoice(url)` для Stars, `@tonconnect/ui-react` для TON

### Валидации

- CV size ≤ 10 МБ, форматы PDF/DOC/DOCX
- Roles — до 5 штук
- Countries — хотя бы 1
- Quota — 10..100 шагом 5
- Salary — 1000..15000 USD шагом 500

### Loading / Error

- Upload и parsing — шаговый progress в самой карточке, **не спиннер на всём экране**
- Payment processing — full-screen с ring-spinner
- Fail — переход на `empty` экран с кнопкой «Вернуться к кампаниям»

## State Management

### Global state

```ts
type AppState = {
  user: { name: string; tgId: number; locale: string };
  profiles: Profile[];           // массив профилей
  defaultProfileId: string;
  campaigns: Campaign[];         // все кампании
  ui: { theme: 'dark' | 'light'; language: string };
};

type Campaign = {
  id: string;                    // 'cmp_ka9f2x' формат
  title: string;
  category: CategoryId;
  status: 'draft' | 'pending' | 'paid' | 'searching' | 'applying' | 'running' | 'completed' | 'failed' | 'cancelled';
  countries: string[];
  price: { amount: number; currency: 'STARS' | 'TON' };
  progress: { found: number; applied: number; quota: number };
  events: Event[];               // timeline
  snapshot: CampaignSnapshot;    // immutable after paid
  createdAt: string;
  paidAt?: string;
};
```

### Wizard draft

Локальный `useState` внутри `ScrWizard` — до оплаты не сохраняется на бэкенд.
После оплаты → `POST /campaigns` → сервер возвращает `id` и запускает workers.

### Real-time updates

Для экрана Detail — WebSocket или SSE, пушит events в timeline + обновляет `progress.applied`. В MVP можно polling 15s.

## Assets

- **Иконки:** все нарисованы inline SVG в `icons.jsx` (Spark, Search, User, Settings, Plus, Check, Arrow, ChevronRight, Globe, Doc, Upload, Close, Star, Alert, Ton). В prod можно заменить на [`lucide-react`](https://lucide.dev) — почти все совпадают.
- **Flags:** 2-letter моно-коды (RU/EN/UK/IT/PL) в цветных тайлах. Для prod — `flag-icons` package или SVG из `country-flag-icons`.
- **Шрифты:** Google Fonts — Inter, JetBrains Mono (self-host в prod для скорости).

## Files

Прототип состоит из следующих модулей (все в корне `design_handoff_job_bot/`):

| Файл                   | Назначение                                                   |
|------------------------|--------------------------------------------------------------|
| `Job Bot Design.html`  | Entry — подключает все jsx-модули, рендерит canvas-вью       |
| `tokens.jsx`           | **Design tokens** — цвета, шрифты, радиусы, статусы, категории |
| `icons.jsx`            | Inline SVG иконки (одна `Icon.*` неймспейс)                  |
| `tg-frame.jsx`         | Telegram-нативная iPhone-рамка с header'ом и safe-areas      |
| `data.jsx`             | Моковые данные (профиль, кампании, события)                  |
| `variants.jsx`         | Стилевые модули (`STYLE_MINIMAL`) — renderers для каждого стиля |
| `screens.jsx`          | **Все 11 экранов** + Wizard steps + вспомогательные компоненты |
| `design-canvas.jsx`    | Canvas-обёртка для артбордов (presentation only)             |

**Точка правды** для логики экранов — `screens.jsx`. Для цветов/типографики — `tokens.jsx` (секция `TOK_MIN`). Для переиспользуемых паттернов (Headline, SectionTitle, Pill, StatusBadge, CategoryChip) — `variants.jsx::STYLE_MINIMAL`.

## Что я НЕ покрыл в дизайне и нужно решить с PM

- Inbox ответов от работодателей (сейчас только цифра «Ответов · 6» на dashboard)
- Push-уведомления от бота (вне Mini App, в чате)
- Реферальная программа
- Детальная аналитика (воронка, success rate по странам)
- Edit/cancel campaign mid-flight
- Экран «как работает AI» (для trust)

---

**Open the prototype:** `Job Bot Design.html` — открыть в браузере (нужны live CDN для React/Babel). Можно сразу кликать — dashboard → detail / checkout → wizard работают.
