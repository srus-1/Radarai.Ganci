# Task Breakdown: In-Place UI Patch for `/order`

## Task 1: Phase 1 — Kill Horizontal Scroll & Save Workspace Rule
**Description:** Save Section 0 hard constraints as a workspace rule (`.agents/rules/order-ui-patch.md`), set Sidebar to `232px` on `>= 1440px` and `64px` icon rail on `768–1439px`, configure `DataTable` with `table-layout: fixed` and `<colgroup>` matching the Section 3.2 width budget (`56/112/136/flex/112/136/112/124/104px`) plus `sticky right-0` on `Aksi`, remove `StatusChip` chevrons, remove the redundant `"Perlu ditagih"` chip and duplicate 2nd date line from `Deadline`, and allow toolbar tabs to shrink without a scrollbar.

**Acceptance criteria:**
- [x] `.agents/rules/order-ui-patch.md` contains Section 0 hard constraints.
- [x] Sidebar is `232px` on `>= 1440px` and `64px` rail on `768–1439px`; table switches to card list when container `< 1080px`.
- [x] `StatusChip` has no `ChevronDown` icon; `Deadline` column has no `"Perlu ditagih"` chip and no duplicate second date line on completed orders; `Aksi` column is `sticky right-0`.
- [x] Section 7 overflow check returns `pageOverflow: false` and `scrollers: []` at `1920`, `1440`, `1280`, `1024`, `768`, and `375px`.

**Verification:**
- [x] Typecheck passes: `npx tsc --noEmit`
- [x] Automated overflow script passes at `1920`, `1440`, `1280`, `1024`, `768`, `375px`
- [x] Git commit created for Phase 1

**Dependencies:** None

**Files likely touched:**
- `.agents/rules/order-ui-patch.md`
- `src/components/layout/Sidebar.tsx`
- `src/components/shared/DataTable.tsx`
- `src/components/order/OrdersDataView.tsx`
- `src/components/shared/StatusChip.tsx`

**Estimated scope:** Medium (5 files)

---

## Task 2: Phase 2 — Merge Split Tables into Single `<table>` with Dual `<tbody>`
**Description:** Extend `DataTable` and `OrdersDataView` so active actionable orders (`Perlu tindakan`) and settled completed+paid orders (`Selesai & lunas`, collapsed by default) render inside a single `<table>` sharing one `<colgroup>`, one `<thead>`, and one select-all checkbox, separated by a full-`colSpan` group toggle `<tr>` with `aria-expanded`.

**Acceptance criteria:**
- [x] Only one `<table>` and one `<thead>` exist on `/order` in desktop table mode.
- [x] Group toggle row (`▾/▸ Selesai & lunas (N)`) spans all columns (`colSpan`), is collapsed by default, and toggles visibility of the second `<tbody>`.
- [x] Unpaid completed orders (e.g. `MF26002`) remain in the top actionable `<tbody>` and never auto-collapse.
- [x] Section 7 overflow check returns `pageOverflow: false` and `scrollers: []` across all 6 viewports.

**Verification:**
- [x] Typecheck passes: `npx tsc --noEmit`
- [x] Automated overflow script passes at `1920`, `1440`, `1280`, `1024`, `768`, `375px`
- [x] Git commit created for Phase 2

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/shared/DataTable.tsx`
- `src/components/order/OrdersDataView.tsx`
- `src/app/order/page.tsx`

**Estimated scope:** Medium (3 files)

---

## Checkpoint 1: After Tasks 1–2
- [x] `npx tsc --noEmit` passes without error
- [x] Single `<table>` with zero horizontal overflow verified at all 6 viewports
- [x] Phase 1 and Phase 2 commits recorded

---

## Task 3: Phase 3 — 1-Row Card Toolbar, `Filter ▾` Popover & Column Header Sorting
**Description:** Update `/order` page header (`Export` outline secondary button + `Input pesanan` primary CTA, unified subtitle `"6 pesanan · 1 belum lunas"`), move the `56px` 1-row toolbar (`Semua · Antre · Diproses · Selesai` tabs on left; Search `<= 280px` + `Filter ▾` popover on right) inside the unified table card, implement the `Filter ▾` popover (`"Belum lunas"` toggle + quick deadline presets + `Dari–Sampai` date range), render removable `✕` filter chips row only when active, and replace native sort `<select>` with sortable `<button>` headers (`Pesanan`, `Deadline`, `Omzet`) with `aria-sort`.

**Acceptance criteria:**
- [x] Page header renders outline `Export` button (not `…` icon-only) + `Input pesanan` CTA; subtitle shows `"6 pesanan · 1 belum lunas"` (adding `"N dikerjakan"` only when `antre + diproses > 0`).
- [x] Desktop card toolbar is a single `56px` row inside the top of the table card with tabs `Semua · Antre · Diproses · Selesai`, search (`max-w-[280px]`), and `Filter ▾` popover button; zero native date/select inputs visible on the toolbar row.
- [x] Active filter chips (`✕`) appear below the toolbar only when a filter is active.
- [x] `Pesanan`, `Deadline`, and `Omzet` column headers sort via `<button>` with `aria-sort` and arrow icons; default sort prioritizes overdue -> completed unpaid -> nearest deadline -> newest.

**Verification:**
- [x] Typecheck passes: `npx tsc --noEmit`
- [x] Automated overflow script passes at `1920`, `1440`, `1280`, `1024`, `768`, `375px`
- [x] Git commit created for Phase 3

**Dependencies:** Task 2

**Files likely touched:**
- `src/app/order/page.tsx`
- `src/components/shared/Toolbar.tsx`
- `src/components/shared/DataTable.tsx`
- `src/components/order/OrdersDataView.tsx`
- `src/components/shared/PageHeader.tsx`

**Estimated scope:** Medium (5 files)

---

## Task 4: Phase 4 — Tokens, Surfaces & `STATUS_STYLE="quiet-normal"`
**Description:** Update CSS tokens in `src/app/globals.css` (`--canvas: #F4F5FA`, `--surface: #FFFFFF`, `--surface-muted: #F7F8FC`, `--border: #E4E6F0`, `--text: #181B2A`, `--text-muted: #5B6078`, `--accent-fg: #FFFFFF`, zero card/row shadows), implement `STATUS_STYLE` (`"quiet-normal"` default + `"all-filled"` option) in `src/lib/status.ts` and `src/components/shared/StatusChip.tsx` (so `Lunas` and `Selesai` have dark green text + check icon with no fill/border, and completed production chips drop `"6/6"`), and update `Sidebar.tsx` so the active nav item uses solid `--accent` background with `--accent-fg` white text/icon and a compact collision-free shift footer.

**Acceptance criteria:**
- [x] `--canvas` (`#F4F5FA`) visibly contrasts with `--surface` (`#FFFFFF`) card; `--text-muted` (`#5B6078`) passes `>= 4.5:1` contrast on both `--surface` and `--surface-muted`.
- [x] `STATUS_STYLE` utility is implemented in `src/lib/status.ts`; in `"quiet-normal"` mode, `Lunas` and `Selesai` render without pill fill/border, `"Belum lunas"` is amber (never green), and `"6/6"` is omitted on completed orders.
- [x] Active sidebar item uses solid `var(--accent)` background + white text/icon; shift footer is compact and clear of collision.
- [x] Section 7 overflow check passes across all 6 viewports.

**Verification:**
- [x] Typecheck passes: `npx tsc --noEmit`
- [x] Automated overflow script passes at `1920`, `1440`, `1280`, `1024`, `768`, `375px`
- [x] Git commit created for Phase 4

**Dependencies:** Task 3

**Files likely touched:**
- `src/app/globals.css`
- `src/lib/status.ts`
- `src/components/shared/StatusChip.tsx`
- `src/components/order/OrdersDataView.tsx`
- `src/components/layout/Sidebar.tsx`

**Estimated scope:** Medium (5 files)

---

## Checkpoint 2: After Tasks 3–4
- [x] `npx tsc --noEmit` and `npx tsx tests/run_all.ts` pass
- [x] Contrast ratios (`>= 4.5:1` text, `>= 3:1` controls) and 6-viewport overflow verified
- [x] Phase 3 and Phase 4 commits recorded

---

## Task 5: Phase 5 — Row Density (`56–60px`), Cell Formatting & Cross-Route Token Audit
**Description:** Refine `/order` table rows to strictly maintain `56–60px` height (`h-[58px]`), single-line truncation with `title` on `Customer` and `Item`, 2-line cells only on `Pesanan` (ID + muted order date) and `Omzet` (`Rp 30.000` + muted `Laba 76,7%`, nominal profit in tooltip/expand), muted text on settled rows, and selected row styling (`6%` accent tint + `2px` left accent border). Inspect `/dashboard`, `/history`, and `/capex` in browser to report any global token visual regressions without editing those routes.

**Acceptance criteria:**
- [x] Desktop rows measure `56–60px` tall (`>= 10` rows fit without vertical page scroll at `1080p` when expanded).
- [x] Only `Pesanan` and `Omzet` cells have 2 lines; `Omzet` line 2 shows `Laba 76,7%` (with nominal profit in `title` and expanded row); `Aksi` has Desain icon (muted when `0`), Edit icon, and `⋯` menu.
- [x] Settled rows in `Selesai & lunas` use muted text styling; selected rows show `6%` accent tint + `2px` left accent border.
- [x] Cross-route check on `/dashboard`, `/history`, and `/capex` completed and logged.

**Verification:**
- [x] Typecheck passes: `npx tsc --noEmit`
- [x] Automated overflow script + row height measurement passes at `1920`, `1440`, `1280`, `1024`, `768`, `375px`
- [x] Git commit created for Phase 5

**Dependencies:** Task 4

**Files likely touched:**
- `src/components/order/OrdersDataView.tsx`
- `src/components/shared/DataTable.tsx`
- `src/app/globals.css`

**Estimated scope:** Small (3 files)

---

## Task 6: Phase 6 — Table Footer Pagination, States, Mobile `< 768px` & Final Self-Audit
**Description:** Add the table card footer (`"Menampilkan 1–6 dari 6"` + page size selector `10 / 25 / 50` + pagination buttons `‹ 1 ›`), align empty/loading/error states (`"Belum ada pesanan."` + `"Input pesanan"`, `"Tidak ada pesanan yang cocok."` + `"Reset filter"`, row-height matched skeletons, error + `"Coba lagi"`), implement the `< 768px` `"Tahap"` dropdown and `<= 120px` mobile cards, complete the full WCAG 2.2 AA accessibility pass (`role="tablist"` arrow key navigation, checkbox `aria-label="Pilih pesanan MF26002"`, `"Pilih semua"`), and run the final test/lint/build and Section 8 self-audit.

**Acceptance criteria:**
- [x] Table footer renders `"Menampilkan X–Y dari Z"`, page size selector (`10`, `25`, `50`), and page navigation buttons inside the bottom of the table card.
- [x] Empty states render `"Belum ada pesanan."` and `"Tidak ada pesanan yang cocok."`; loading skeleton rows match `58px` row height (zero CLS).
- [x] On `< 768px` (`375px`), stage tabs collapse into a `"Tahap"` dropdown, cards measure `<= 120px` height (collapsed), bottom tab bar has 4 items, and horizontal scroll is zero.
- [x] All quality gates (`npx tsx tests/run_all.ts`, `npx tsc --noEmit`, `npm run lint`, `npm run build`) and Section 7 overflow checks across all 6 viewports pass.

**Verification:**
- [x] Tests pass: `npx tsx tests/run_all.ts`
- [x] Build & lint succeed: `npx tsc --noEmit && npm run lint && npm run build`
- [x] Automated overflow script passes at `1920`, `1440`, `1280`, `1024`, `768`, `375px`
- [x] Git commit created for Phase 6

**Dependencies:** Task 5

**Files likely touched:**
- `src/app/order/page.tsx`
- `src/components/order/OrdersDataView.tsx`
- `src/components/shared/Toolbar.tsx`
- `src/components/shared/StateViews.tsx`
- `src/components/shared/DataTable.tsx`

**Estimated scope:** Medium (5 files)

---

## Checkpoint 3: Complete (After Tasks 5–6)
- [x] All 6 phase commits created with clean messages
- [x] Raw Section 7 JSON output captured across `1920`, `1440`, `1280`, `1024`, `768`, `375px` for every phase
- [x] `npx tsx tests/run_all.ts`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass 100%
- [x] Section 8 Self-Audit Checklist completed with proof
