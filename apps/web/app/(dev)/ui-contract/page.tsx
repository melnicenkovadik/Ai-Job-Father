import {
  Clamp,
  FieldGroup,
  HScroll,
  Row,
  Screen,
  Scroll,
  Section,
  Stack,
} from '@/components/ui/layout';

/**
 * Visual regression fixture for the Responsive UI Contract primitives.
 * Intentionally static, locale-independent, no Telegram dependencies — so
 * Playwright can snapshot deterministic layouts across viewports and themes
 * (3 viewports × 2 themes × 3 locale-class fixtures = 18 screenshots per
 * Phase 6 matrix; Phase 1 runs a trimmed 3×2×2 = 12 set per D1.5).
 *
 * Every primitive is exercised with:
 *   - EN baseline string (short)
 *   - RU-long-simulation string
 *   - long-token string (AI-output shape) for Clamp + overflow-wrap checks
 */
export default function UiContractFixturePage() {
  return (
    <Screen reserveMainButton={false}>
      <Scroll>
        <Stack gap={6} className="p-6">
          <Section title="Primitives — smoke test">
            <Stack gap={3}>
              <p className="text-sm opacity-70">
                Each block below exercises one primitive under the worst-case content it is expected
                to survive: long unbroken tokens, RU/IT string inflation, nested flex with shrink-0
                siblings.
              </p>
            </Stack>
          </Section>

          <Section title="Stack (gap=3)">
            <Stack gap={3}>
              <div className="rounded border border-[var(--color-hint,rgba(0,0,0,0.15))] p-3 text-sm">
                Row A — short.
              </div>
              <div className="rounded border border-[var(--color-hint,rgba(0,0,0,0.15))] p-3 text-sm">
                Row B — медленно разрастающаяся строка, имитирующая RU / IT локаль с характерным
                удлинением на 30–40%.
              </div>
              <div className="rounded border border-[var(--color-hint,rgba(0,0,0,0.15))] p-3 text-sm [overflow-wrap:anywhere]">
                Row C —
                very_long_unbroken_token_like_an_ai_identifier_that_would_otherwise_force_a_horizontal_scroll_without_overflow_wrap_anywhere_on_the_parent
              </div>
            </Stack>
          </Section>

          <Section title="Row (gap=2) — icon + truncating label + trailing chip">
            <Row gap={2} className="items-center">
              <span aria-hidden className="shrink-0 text-lg">
                ⚙︎
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                A very long single-line label that must truncate instead of pushing the trailing
                chip off-screen on a 320px device.
              </span>
              <span className="shrink-0 rounded-full bg-[var(--color-bg-secondary,rgba(0,0,0,0.05))] px-2 py-0.5 text-xs">
                EN
              </span>
            </Row>
          </Section>

          <Section title="HScroll — pill rail (snap-start)">
            <HScroll className="gap-2">
              {[
                'tech',
                'design',
                'marketing',
                'sales',
                'product',
                'finance',
                'hr',
                'support',
                'content',
                'ops',
                'data',
                'web3',
              ].map((slug) => (
                <span
                  key={slug}
                  className="shrink-0 snap-start rounded-full border border-[var(--color-hint,rgba(0,0,0,0.15))] px-3 py-1 text-xs"
                >
                  {slug}
                </span>
              ))}
            </HScroll>
          </Section>

          <Section title="FieldGroup — label / hint / error">
            <Stack gap={3}>
              <FieldGroup label="Email" hint="We never share it.">
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="min-h-[2.75rem] rounded-md border border-[var(--color-hint,rgba(0,0,0,0.15))] bg-transparent px-3 py-1 text-sm"
                />
              </FieldGroup>
              <FieldGroup label="Password" error="At least 8 characters with a digit.">
                <input
                  type="password"
                  className="min-h-[2.75rem] rounded-md border border-red-600 bg-transparent px-3 py-1 text-sm"
                />
              </FieldGroup>
            </Stack>
          </Section>

          <Section title="Clamp (lines=2) — long AI-shaped text">
            <Clamp lines={2}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur in commodo arcu.
              Integer pulvinar, dui vel pretium laoreet, lacus nisl ultrices nunc, eget vulputate
              velit orci a orci. Suspendisse potenti. Nulla facilisi. Aenean nec est at tortor
              laoreet pellentesque. (auto-truncates at 2 lines; full text is still in DOM.)
            </Clamp>
          </Section>

          <Section title="Long-token stress (overflow-wrap:anywhere)">
            <p className="text-sm [overflow-wrap:anywhere]">
              https://very.long.domain.example.com/path/segment/that/is/obnoxiously/long/and/has/no/natural/break/points/whatsoever?query=parameters&more=here
            </p>
          </Section>
        </Stack>
      </Scroll>
    </Screen>
  );
}
