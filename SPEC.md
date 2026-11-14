# Spec: In-Place UI Patch for `/order` (`Mafrend.Order`)

## Objective
Perform an in-place UI patch on the `/order` route (`Antrean Pesanan`) so workshop admins and production operators can scan, filter, sort, and act on production and billing exceptions inside a single unified table card (`--surface` `#FFFFFF` over `--canvas` `#F4F5FA`) with 56–60px single-line rows, zero horizontal scroll across all viewports (`1920`, `1440`, `1280`, `1024`, `768`, `375px`), and WCAG 2.2 AA contrast.

### Confirmed Decisions (from `/grill-me`)
1. **Status Chip Policy (`STATUS_STYLE="quiet-normal"`):**
   - Settled states (`LUNAS`, `SELESAI`) render as dark green text (`--status-green-ink`) + check icon with **no pill fill and no border**, eliminating the "wall of green".
   - Active/exception states (`BELUM_LUNAS`, `DP`, `SETTING_DESAIN`, `PROSES_CETAK`, `FINISHING`, `SIAP_KIRIM`, `ANTREAN`, and overdue badges) use semantic tinted pill fills (`h-6` / 24px, `px-2.5`, `text-xs font-medium`, 12–14px icon, no chevron, no `"6/6"` suffix on completed rows).
2. **Stage Tabs & Page Subtitle:**
   - Stage tabs use compact labels: `Semua · Antre · Diproses · Selesai` (allowing shrink without horizontal scrollbar).
   - Page subtitle displays real counts only: `"6 pesanan · 1 belum lunas"` (and includes `"N dikerjakan"` only when `antre + diproses > 0`).
3. **Toolbar & `Filter ▾` Popover:**
   - 56px 1-row card toolbar inside the top of the table card: Tabs on the left; Search (`max-w-[280px]`) + `Filter ▾` popover button on the right.
   - `Filter ▾` popover contains: `"Belum lunas"` toggle, quick deadline presets (`Terlambat`, `Hari ini`, `Besok`, `7 hari ke depan`), and a Deadline date range (`Dari` – `Sampai`).
   - Active filters render as removable `✕` chips below the toolbar **only when active**.
   - Column sorting moves into `<button>` elements inside `<thead>` (`Pesanan`, `Deadline`, `Omzet`) with `aria-sort` and arrow icons; native `<select>` sort and floating labels are removed.
4. **Execution Mode:**
   - Execute Phases 1–6 sequentially, creating 1 atomic git commit per phase and running the Section 7 automated overflow check across all 6 viewports (`1920`, `1440`, `1280`, `1024`, `768`, `375px`) after each phase.

## Tech Stack
- **Framework:** Next.js `16.4.2` (App Router, Turbopack)
- **UI Library:** React `19.3.0`, React DOM `19.3.0`
- **Styling:** Tailwind CSS v4 (`@tailwindcss/turbopack`), `clsx` `^2.1.1`, `tailwind-merge` `^3.7.0`
- **Icons:** `lucide-react` `^1.61.0`
- **Data / Backend:** `@supabase/supabase-js` `^2.118.0` (untouched)
- **Language & Tooling:** TypeScript `^5`, ESLint `^9`, `tsx` `^4.23.15`

## Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Lint check
npm run lint

# TypeScript typecheck
npx tsc --noEmit

# Automated E2E & integration test suite
npx tsx tests/run_all.ts
```

## Project Structure
```text
src/
├── app/
│   ├── globals.css              → Design tokens (--canvas, --surface, --surface-muted, --border, status tints)
│   ├── layout.tsx               → Root application shell & main container
│   ├── order/page.tsx           → /order route page state, filter popover, sorting, pagination, single-card layout
│   ├── dashboard/page.tsx       → Read-only check in Phase 5 for token side effects (do NOT edit)
│   ├── history/page.tsx         → Read-only check in Phase 5 for token side effects (do NOT edit)
│   └── capex/page.tsx           → Read-only check in Phase 5 for token side effects (do NOT edit)
├── components/
│   ├── layout/Sidebar.tsx       → 232px desktop (>=1440px), 64px rail (768–1439px), bottom tab bar (<768px)
│   ├── order/OrdersDataView.tsx → /order columns, single-table dual-tbody groups, inline expand, <=120px mobile cards
│   └── shared/
│       ├── DataTable.tsx        → table-layout: fixed, <colgroup>, sortable <th>, multi-tbody group support, sticky Aksi
│       ├── StatusChip.tsx       → 24px chip without chevron, supporting STATUS_STYLE ('quiet-normal' | 'all-filled')
│       ├── Toolbar.tsx          → 56px 1-row card toolbar, tablist keyboard nav, active filter chips row
│       ├── PageHeader.tsx       → Single-line page header with Export (outline secondary) + Input pesanan (primary CTA)
│       ├── ExportMenuButton.tsx → Outline secondary Export button trigger
│       └── StateViews.tsx       → Row-height matched skeletons, empty states, error state
├── lib/
│   ├── status.ts                → STATUS_STYLE policy, status metadata & actionability helpers
│   └── utils.ts                 → Relative deadline, currency, percentage (id-ID comma decimal), date formatters
└── types/
    └── order.ts                 → Domain interfaces (untouched)
tests/
└── run_all.ts                   → Automated test runner
```

## Code Style
- **Token-driven styling:** Use CSS custom properties defined in `src/app/globals.css` (`var(--canvas)`, `var(--surface)`, `var(--surface-muted)`, `var(--border)`, `var(--text)`, `var(--text-muted)`, `var(--accent)`, `var(--accent-fg)`) with zero box-shadows on cards/rows (`--shadow-overlay` reserved strictly for floating popovers/dialogs).
- **Single-source status styling (`STATUS_STYLE`):**
```tsx
export type StatusStyleMode = 'quiet-normal' | 'all-filled';

export function getStatusChipClasses(
  meta: StatusMeta,
  isSettledNormal: boolean,
  mode: StatusStyleMode = 'quiet-normal'
): string {
  if (mode === 'quiet-normal' && isSettledNormal) {
    return 'bg-transparent border-transparent text-[var(--status-green-ink)] px-1';
  }
  return TONE_CLASSES[meta.tone];
}
```
- **Formatting (`id-ID`):** Currency `Rp 30.000`, percentage `76,7%`, short date `13 Nov 2026`, zero emojis, sentence-case status labels (`Lunas`, `Belum lunas`, `DP`, `Antrean`, `Setting desain`, `Proses cetak`, `Finishing`, `Siap kirim`, `Selesai`).

## Testing Strategy
- **Automated DOM / Overflow Audit (Section 7):** Run via Chrome DevTools MCP after **every phase** across all 6 required widths (`1920`, `1440`, `1280`, `1024`, `768`, `375px`):
  ```js
  (() => {
    const de = document.documentElement;
    const bad = [...document.querySelectorAll('*')]
      .filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible')
      .map(el => el.tagName + '.' + String(el.className).slice(0, 60));
    return { pageOverflow: de.scrollWidth > de.clientWidth, scrollers: bad };
  })()
  ```
- **Regression Suite:** Run `npx tsx tests/run_all.ts`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- **Contrast & Accessibility Verification:** Verify WCAG 2.2 AA contrast (`>= 4.5:1` for text including `--text-muted` `#5B6078` on `--surface` `#FFFFFF` and `--surface-muted` `#F7F8FC`; `>= 3:1` for UI controls), keyboard navigation (`role="tablist"`, `aria-sort`, `aria-expanded`), and hit targets (`>= 32px` desktop, `>= 44px` mobile, `24px` hard floor).

## Boundaries
- **Always do:**
  - Keep diffs small and scoped to `/order` and its shared UI primitives.
  - Create 1 separate git commit per phase (Phases 1 to 6) with a clear message.
  - Run the Section 7 6-viewport overflow check and capture evidence after each phase.
  - Preserve existing functionality (create, edit, soft-delete with 8s undo, bulk delete, status listbox updates, WhatsApp links, design drawer, CSV/Excel/PDF export).
- **Ask first (Scope Gate):**
  - Any fix that would require touching the data layer, renaming files/routes, or altering shared component behavior in a way that breaks `/dashboard`, `/history`, or `/capex`.
- **Never do:**
  - Rename files, components, or routes, or alter folder structure.
  - Touch `src/context/OrderContext.tsx`, Supabase queries, server actions, data hooks, domain types (`src/types/order.ts`), or HPP/profit formulas.
  - Add new packages to `package.json`.
  - Edit `/dashboard`, `/history`, or `/capex` route files (only inspect and report any global token side effects in Phase 5).

## Success Criteria
1. **Zero Horizontal Overflow:** `pageOverflow: false` and `scrollers: []` at `1920`, `1440`, `1280`, `1024`, `768`, and `375px` after every phase.
2. **Unified Single Table & Sticky Actions:** Active orders (`Perlu tindakan`) and settled orders (`Selesai & lunas`, collapsed by default) live inside a single `<table>` with `<colgroup>` (`table-layout: fixed`) and shared `<thead>`; `Aksi` column (`104px`) is `sticky right-0` and never clipped.
3. **Row Density & Redundancy Removal:** Desktop table rows measure `56–60px` tall; no `"Perlu ditagih"` chip in Deadline, no duplicate second date line on completed orders, no `"6/6"` suffix on completed production chips, and no chip chevrons.
4. **Sidebar & Responsive Breakpoints:** Sidebar renders at `232px` on `>= 1440px`, `64px` icon rail on `768–1439px`, and 4-item bottom tab bar on `< 768px`; active nav item uses solid `--accent` background with `--accent-fg` (`#FFFFFF`) text/icon; shift footer is compact and collision-free.
5. **1-Row Card Toolbar & Header Sorting:** Page header has outline `Export` + primary `Input pesanan`; card toolbar (`56px`) has compact tabs (`Semua · Antre · Diproses · Selesai`), search (`<= 280px`), and `Filter ▾` popover; active filters appear as removable `✕` chips only when active; `Pesanan`, `Deadline`, and `Omzet` headers sort via `<button>` with `aria-sort`.
6. **Table Footer, States & Mobile:** Table footer shows `"Menampilkan X–Y dari Z"` + page-size selector (`10/25/50`) + pagination; empty/loading/error states match spec copy (`"Belum ada pesanan."`, `"Tidak ada pesanan yang cocok."`, `"Coba lagi"`); `< 768px` renders compact cards (`<= 120px` collapsed height) and a `"Tahap"` dropdown.

## Open Questions
None — all 4 design and execution questions were resolved and confirmed during the `/grill-me` interview.
