import type { Campaign, MockProfile, MockSettings, WizardDraft } from './types';

export const SEED_CAMPAIGNS: readonly Campaign[] = [
  {
    id: 'c-7a2f',
    title: 'Senior Frontend Engineer',
    category: 'tech',
    status: 'searching',
    progress: { found: 47, applied: 12, quota: 50 },
    price: { amount: 450, currency: 'STARS' },
    countries: ['DE', 'NL', 'PL', 'UA'],
    createdAt: '2ч назад',
    paidAt: '2ч назад',
    events: [
      { t: '14:22', kind: 'applied', text: 'Отклик отправлен · Klarna' },
      { t: '14:19', kind: 'found', text: 'Найдено 8 вакансий · Notion' },
      { t: '14:05', kind: 'applied', text: 'Отклик отправлен · Vercel' },
      { t: '13:51', kind: 'started', text: 'Поиск запущен' },
      { t: '13:50', kind: 'paid', text: 'Оплата получена · 450 ⭐' },
    ],
  },
  {
    id: 'c-3b1a',
    title: 'Product Designer',
    category: 'design',
    status: 'completed',
    progress: { found: 62, applied: 30, quota: 30 },
    price: { amount: 1.8, currency: 'TON' },
    countries: ['Any EU'],
    createdAt: 'вчера',
    paidAt: 'вчера',
  },
  {
    id: 'c-9d4e',
    title: 'Growth Marketer',
    category: 'marketing',
    status: 'draft',
    progress: { found: 0, applied: 0, quota: 25 },
    price: { amount: 220, currency: 'STARS' },
    countries: ['US', 'UK'],
    createdAt: '5 мин назад',
  },
];

export const SEED_PROFILES: readonly MockProfile[] = [
  {
    id: 'p-default',
    isDefault: true,
    name: 'Вадим Мельниченко',
    headline: 'Senior Frontend Engineer · 7 лет',
    location: 'Киев, Украина',
    email: 'vadim@example.com',
    skills: [
      'TypeScript',
      'React',
      'Next.js',
      'Node.js',
      'PostgreSQL',
      'GraphQL',
      'Tailwind',
      'AWS',
    ],
    experience: [
      { co: 'Monobank', role: 'Senior Frontend', period: '2023 — настоящее' },
      { co: 'Ajax Systems', role: 'Frontend Engineer', period: '2020 — 2023' },
      { co: 'Readdle', role: 'Junior Frontend', period: '2018 — 2020' },
    ],
    languages: [
      { code: 'UK', label: 'Украинский', level: 'Native' },
      { code: 'EN', label: 'Английский', level: 'C1' },
      { code: 'RU', label: 'Русский', level: 'Native' },
    ],
  },
];

export const SEED_SETTINGS: MockSettings = {
  locale: 'ru',
  notifications: {
    push: true,
    email: false,
    weeklyDigest: true,
  },
  hasOnboarded: true,
};

export const EMPTY_DRAFT: WizardDraft = {
  roles: [],
  countries: [],
  salaryCurrency: 'STARS',
  stack: [],
  languages: [],
  quota: 25,
};

export const WIZARD_STEPS = [
  'Профиль',
  'Роли',
  'Страны',
  'Зарплата',
  'Стек',
  'Языки',
  'Объём',
  'Чек',
] as const;
