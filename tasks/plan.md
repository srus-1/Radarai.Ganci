# Implementation Plan: In-Place UI Patch for `/order` (`Mafrend.Order`)

## Concise 20-Line Implementation Plan (Master Prompt Deliverable #1)
1. **Rule Setup (Section 0.6):** Save Section 0 hard constraints into `.agents/rules/order-ui-patch.md` and `AGENTS.md`.
2. **Phase 1 — Kill Horizontal Scroll:**
   - `src/components/layout/Sidebar.tsx`, `src/lib/sidebar.ts`: Set `232px` desktop width (`>= 1440px`) and `64px` icon rail (`768–1439px`).
   - `src/components/shared/DataTable.tsx`, `src/components/order/OrdersDataView.tsx`: Add `table-layout: fixed`, `<colgroup>` (`56/112/136/flex/112/136/112/124/104px`), `min-w-0`, `sticky right-0` on `Aksi`.
   - `src/components/shared/StatusChip.tsx`, `src/components/shared/Toolbar.tsx`: Strip chip chevrons, strip `"Perlu ditagih"` chip & duplicate 2nd Deadline line, allow tabs to shrink without scrollbar.
3. **Phase 2 — Single Table (`<table>` with Dual `<tbody>`):**
   - `src/components/shared/DataTable.tsx`: Support secondary `<tbody>` group with a full-`colSpan` toggle `<tr>` (`aria-expanded`) and a single shared `<thead>` / select-all checkbox.
   - `src/app/order/page.tsx`, `src/components/order/OrdersDataView.tsx`: Merge `"Perlu tindakan"` and `"Selesai & lunas"` (collapsed by default) into one `<OrdersDataView>` / `<table>`.
4. **Phase 3 — Toolbar, Filter Popover & Header Sorting:**
   - `src/components/shared/PageHeader.tsx`, `src/components/shared/ExportMenuButton.tsx`: Outline `Export` button + primary `Input pesanan` CTA; unify subtitle (`"6 pesanan · 1 belum lunas"`).
   - `src/components/shared/Toolbar.tsx`, `src/app/order/page.tsx`, `src/components/order/OrdersDataView.tsx`: Wrap 56px 1-row toolbar (`Semua · Antre · Diproses · Selesai`, search `<= 280px`, `Filter ▾` popover with `"Belum lunas"` + quick presets + date range, removable `✕` chips) inside the table card; add `<button>` + `aria-sort` header sorting on `Pesanan`, `Deadline`, `Omzet`.
5. **Phase 4 — Tokens, Surfaces & `STATUS_STYLE`:**
   - `src/app/globals.css`, `src/lib/status.ts`, `src/components/shared/StatusChip.tsx`, `src/components/layout/Sidebar.tsx`: Apply `--canvas: #F4F5FA`, `--surface: #FFFFFF`, `--surface-muted: #F7F8FC`, `--border: #E4E6F0`, `--text: #181B2A`, `--text-muted: #5B6078`, `STATUS_STYLE="quiet-normal"` (`Lunas`/`Selesai` no fill/border, no `"6/6"` on completed), solid `--accent` active nav, compact shift footer.
6. **Phase 5 — Row Density & Cross-Route Audit:**
   - `src/components/order/OrdersDataView.tsx`, `src/components/shared/DataTable.tsx`: Enforce `56–60px` row height, 1-line cells (except `Pesanan` & `Omzet`), `Omzet` line 2 `Laba 76,7%`, muted completed rows, and inspect `/dashboard`, `/history`, `/capex` for token side effects.
7. **Phase 6 — Footer, States, A11y & Mobile (`< 768px`):**
   - `src/app/order/page.tsx`, `src/components/order/OrdersDataView.tsx`, `src/components/shared/StateViews.tsx`: Add table footer (`"Menampilkan X–Y dari Z"` + `10/25/50` page size + pagination), exact empty/error/skeleton states, `< 768px` `"Tahap"` dropdown + compact `<= 120px` cards, and full WCAG 2.2 AA check.

---

## Overview
This plan decomposes [SPEC.md](file:///C:/[Bisnis]Ganci/Radarai.Ganci/radarai.store/SPEC.md) and [master_prompt_antigravity_patch_order_ui.md](file:///C:/[Bisnis]Ganci/Radarai.Ganci/radarai.store/master_prompt_antigravity_patch_order_ui.md) into 6 sequential, atomic phases (`Task 1` to `Task 6`). Each phase touches at most 5 files, leaves the application buildable and functional, records 1 git commit, and runs the 6-viewport Section 7 overflow check (`1920`, `1440`, `1280`, `1024`, `768`, `375px`).

## Dependency Graph
```text
Phase 1: Layout & Column Width Budget (Sidebar 232/64px + fixed <colgroup> + sticky Aksi + strip chevrons/duplicates)
   │
   ▼
Phase 2: Unified Single <table> (Multi-<tbody> group row inside DataTable + single select-all)
   │
   ▼
Phase 3: 1-Row Card Toolbar, Filter Popover & Header Sorting (aria-sort on Pesanan, Deadline, Omzet)
   │
   ▼
Phase 4: Surface Tokens & STATUS_STYLE="quiet-normal" (globals.css + StatusChip + solid active Sidebar nav)
   │
   ▼
Phase 5: 56-60px Row Density, 1-Line Cell Truncation & Cross-Page Token Audit (/dashboard, /history, /capex)
   │
   ▼
Phase 6: Pagination Footer, Empty/Error/Skeleton States, Mobile <=120px Cards & Final Self-Audit
```

## Architecture Decisions
1. **Backward-Compatible Shared Components (`DataTable`, `Toolbar`, `StatusChip`):**
   - All new props (`colWidths`, `secondaryGroup`, `sortable`, `sortDirection`, `onSort`, `styleMode`) are optional so `/dashboard`, `/history`, and `/capex` continue compiling and rendering without edits.
2. **Container-Aware Responsive Table vs Card Switching:**
   - Use a `@container` wrapper around the `/order` table card so viewports where the content container is `>= 1080px` render the fixed-layout table, while narrow tablet (`768–1023px` or container `< 1080px`) and mobile (`< 768px`) render the compact card list with zero horizontal overflow.
3. **Page-Local Filter & Pagination State:**
   - Deadline range (`deadlineFrom`, `deadlineTo`), quick preset (`OVERDUE` | `TODAY` | `TOMORROW` | `NEXT_7_DAYS`), column sort state (`field`, `direction`), and pagination (`page`, `pageSize`) are managed inside `src/app/order/page.tsx` without mutating `OrderContext.tsx`.

## Task List (Detailed in `tasks/todo.md`)

### Phase 1: Kill Horizontal Scroll
- [x] **Task 1:** Sidebar `232px`/`64px` rail, `table-layout: fixed` + `<colgroup>`, sticky `Aksi`, strip chip chevrons & Deadline duplicates

### Phase 2: Single Table Architecture
- [x] **Task 2:** Merge active & settled groups into one `<table>` with two `<tbody>` sections and a `colSpan` group toggle row

### Checkpoint 1: After Tasks 1–2
- [x] Zero horizontal overflow across all 6 viewports; single `<table>` structure verified

### Phase 3: Toolbar, Filter Popover & Column Sorting
- [x] **Task 3:** Unified card toolbar (`56px`), `Filter ▾` popover (unpaid + presets + date range), active `✕` chips, and `aria-sort` header buttons

### Phase 4: Tokens, Surfaces & `STATUS_STYLE="quiet-normal"`
- [x] **Task 4:** Apply Section 3.5 CSS tokens, `STATUS_STYLE="quiet-normal"`, solid `--accent` sidebar active state, and compact shift footer

### Checkpoint 2: After Tasks 3–4
- [x] WCAG 2.2 AA contrast verified; 6-viewport overflow check passes; tests & build clean

### Phase 5: Row Density & Cross-Route Token Audit
- [x] **Task 5:** Enforce `56–60px` single-line rows, `Laba 76,7%` subline, muted settled rows, and inspect `/dashboard`, `/history`, `/capex`

### Phase 6: Footer Pagination, States, Mobile `< 768px` & Self-Audit
- [x] **Task 6:** Table pagination footer (`10/25/50`), spec empty/error/skeleton states, `< 768px` `"Tahap"` dropdown & `<= 120px` cards, Section 8 self-audit

### Checkpoint 3: Complete
- [x] All 6 phase changes applied, all 80+ automated tests + `tsc` + `lint` pass, Section 7 & Section 8 deliverables complete

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Fixed table columns overflow between `1024px` and `1279px` | High | Use `64px` sidebar rail on `1024–1439px` and container query switching to Card list whenever table container `< 1080px` (Section 3.3). |
| Global token updates in `globals.css` affect `/dashboard`, `/history`, `/capex` | Medium | Keep semantic token names backward-compatible (`--bg` aliased with `--canvas`) and inspect all 3 sibling routes in Phase 5. |
| Existing unit/E2E tests in `tests/` check specific copy or component exports | High | Keep all exported function/component signatures intact and run `npx tsx tests/run_all.ts` during verification. |

## Open Questions
- None.
