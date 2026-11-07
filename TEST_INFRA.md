# TEST_INFRA.md — Testing Infrastructure & Quality Assurance Specification

**Project:** eganci Admin & Production Order Management (`radarai.store`)  
**Architecture:** Next.js 16 (Turbopack), React 19, TypeScript 5, Supabase (PostgreSQL + PostgREST + Storage)  
**Specification Author:** `e2e_testing_track_1`  
**Date:** 2026-10-23  

---

## 1. Overview & Test Philosophy

### 1.1 Opaque-Box & Requirement-Driven Principle
The testing harness is constructed following an **opaque-box (black-box), requirement-driven philosophy**. Instead of testing volatile internal implementation details or private component states, tests target public contracts, domain behaviors, state transitions, and business invariants defined by requirements **R1 through R4**:

- **R1: Notion-Style Minimalist UI**: Verification of layout invariants, empty states, complete non-placeholder components, and aesthetic consistency.
- **R2: Concise Indonesian Microcopy**: Validation of user-facing strings — labels/buttons adhere strictly to $\le$ 4 words, helper texts $\le$ 1 short sentence, strictly in Bahasa Indonesia.
- **R3: Responsive Interactions & Optimistic Feedback**: Verification that state updates immediately reflect in UI state, accompanied by reliable rollback semantics whenever backend/database operations fail.
- **R4: Supabase Persistence & Financial Parity**: Authentic testing of CRUD, queue reordering, artwork file handling in Supabase storage, graceful setup fallbacks when credentials are unconfigured/placeholder, and 100% mathematical precision for derived financial metrics (omzet, HPP breakdown, net profit, margin %, remaining balance).

### 1.2 Integrity Mandate & Genuine State Management
- **No Facades or Hardcoded Passes**: All test cases maintain authentic in-memory state or mock database state. Assertions evaluate real objects, returned calculations, and actual error handling paths.
- **Decoupled from Live Infrastructure**: A clean, fully typed in-memory Supabase client and storage mock runs identically in any CI/local developer environment without requiring active cloud credentials or network connectivity.
- **Deterministic & Fast Execution**: Entire test suite executes in under 5 seconds with zero external network flakiness.

---

## 2. Feature Inventory & Mapping Across R1–R4

| Feature ID | Feature Name | Mapped Requirements | Public Contract / Core Responsibilities |
|---|---|---|---|
| **F-01** | **Order Intake & Creation** | R1, R2, R3, R4 | Validates intake schema, auto-generates order number format (`EG-YYYY-XXX`), assigns default queue position, calculates initial HPP, omzet, profit, margin %, payment balances. |
| **F-02** | **Order Listing, Filtering & Search** | R1, R2, R4 | Tab filters (`ALL`, `BELUM_LUNAS_DP`, `PROSES`, `SELESAI`), text query search across customer/product/order code, date filters, and informative Notion-style empty states. |
| **F-03** | **Order Mutation & Status Progression** | R1, R2, R3, R4 | Updates order details, handles 6-stage workflow transitions (`ANTREAN` $\to$ `SETTING_DESAIN` $\to$ `PROSES_CETAK` $\to$ `FINISHING` $\to$ `SIAP_KIRIM` $\to$ `SELESAI`), payment status toggles (`BELUM_LUNAS`, `DP`, `LUNAS`), and automatic recalculations. |
| **F-04** | **Order Deletion & Queue Continuity** | R1, R3, R4 | Deletes order records, cascades linked design files, maintains contiguous queue indexing, and supports optimistic rollback on failure. |
| **F-05** | **Queue Priority & Reordering** | R1, R3, R4 | Reorders queue items, updates `queue_order` sequentially ($1..N$), ensures no priority collision or orphaned ranks. |
| **F-06** | **Design File Lifecycle & Artwork Drawer** | R1, R2, R3, R4 | Uploads print files (`.cdr`, `.ai`, `.psd`, `.pdf`, `.png`, `.jpg`), enforces size limits, toggles `isReadyToPrint` production flag, removes files from storage and database. |
| **F-07** | **Derived Financial Metrics & Aggregations** | R4 | Validates formulas for `omzet`, 5-component `hppBreakdown`, `profit`, `marginPct`, `remainingPayment`, dashboard metrics summary, monthly revenue/profit aggregates, and buyer profit rankings. |
| **F-08** | **Supabase Configuration & Fallback State** | R4 | Detects valid vs missing/placeholder Supabase credentials, returns non-crashing empty state `[]`, and presents actionable setup guidance without throwing unhandled runtime exceptions. |
| **F-09** | **Indonesian Microcopy & UX Constraints** | R1, R2 | Enforces microcopy rules: button/label length $\le$ 4 words, description $\le$ 1 short sentence, valid Indonesian terminology, empty states for all views. |

---

## 3. Four-Tier Test Architecture

The test suite is structured into four progressive tiers to guarantee both granular coverage and end-to-end operational resilience:

```
tests/
├── helpers/
│   ├── mockSupabase.ts          # Authentic in-memory PostgREST + Storage emulator
│   ├── mockData.ts              # Seed generators & domain fixtures
│   └── assertions.ts            # Domain assertion helpers & microcopy validators
├── tier1_feature_coverage/
│   ├── f01_order_create.test.ts # >= 5 tests: Create order, defaults, number gen, HPP init
│   ├── f02_order_list.test.ts   # >= 5 tests: Query, tabs, search, date filtering, empty list
│   ├── f03_order_update.test.ts # >= 5 tests: Field edits, status cycle, payment switch, recalc
│   ├── f04_order_delete.test.ts # >= 5 tests: Delete, cascade files, queue shift, rollback
│   ├── f05_queue_reorder.test.ts# >= 5 tests: Priority reordering, sequential indexing
│   ├── f06_design_files.test.ts # >= 5 tests: File upload, format check, ready flag, deletion
│   ├── f07_financials.test.ts   # >= 5 tests: Omzet, HPP, profit, margin, buyer rankings
│   ├── f08_setup_notice.test.ts # >= 5 tests: Credential detector, fallback banner, safety
│   └── f09_microcopy.test.ts    # >= 5 tests: Microcopy constraints, button labels, descriptions
├── tier2_boundary_corner/
│   ├── b01_quantity_limits.test.ts   # Zero qty handling, 1 pc minimum, 100,000+ extreme batches
│   ├── b02_financial_extremes.test.ts# DP == Total, DP = 0, DP > Total prevention, 0 price
│   ├── b03_margin_breakdown.test.ts  # 0% margin, negative margin warnings, 100% margin
│   ├── b04_file_boundaries.test.ts   # Empty file name, unsupported extensions, large files
│   └── b05_queue_boundaries.test.ts  # Empty queue reorder, single item, nonexistent IDs
├── tier3_cross_feature/
│   ├── c01_status_and_reorder.test.ts# Status changes while concurrently reordering queue
│   ├── c02_payment_and_profit.test.ts# Down payment updates with retroactive HPP adjustments
│   ├── c03_delete_and_queue.test.ts  # Mid-queue deletion followed by bulk drag-and-drop
│   ├── c04_design_and_status.test.ts # Ready-to-print toggling triggering production transitions
│   └── c05_rollback_on_failure.test.ts# Network error simulation & optimistic state rollback
├── tier4_real_world/
│   ├── s01_keychain_bulk_intake.test.ts # 500pcs Acrylic Keychain: intake -> DP -> CDR upload -> Ready -> Cetak -> Finishing -> Lunas -> Selesai
│   ├── s02_screenprint_urgent.test.ts   # 150pcs Plastisol T-shirt: rush deadline, design revision, queue leap, invoice settlement
│   ├── s03_multiproduct_repeat.test.ts  # Loyal buyer repeat ordering: aggregate metrics & buyer ranking promotion
│   ├── s04_cancel_and_reversal.test.ts  # Mistaken order entry, immediate deletion, queue index repair, zero ledger leakage
│   └── s05_setup_to_configured.test.ts  # Workshop startup with placeholder env, configuration injected, seamless order sync
└── run_all.ts                           # Unified CLI test runner & reporter
```

### 3.1 Tier 1: Feature Coverage Requirements
- **$\ge 5$ distinct test cases per feature** across all 9 features (total $\ge 45$ tests).
- Verifies every core capability: create, read/list, update, delete, reorder, design file actions, setup notice fallback, and derived metrics.

### 3.2 Tier 2: Boundary & Corner Cases Requirements
- **$\ge 5$ test cases per boundary domain** (total $\ge 25$ tests).
- Examines extreme values: zero quantities, 100,000+ unit runs, DP equal to total, DP = 0, negative margins, unsupported file formats, empty search results, single-item queues.

### 3.3 Tier 3: Cross-Feature Combinations Requirements
- Evaluates pairwise interactions:
  - Process status transitions combined with queue priority repositioning.
  - Cost adjustments combined with payment status recalculation.
  - Order deletions combined with subsequent queue shifts.
  - Optimistic UI updates with simulated network failure and rollback.

### 3.4 Tier 4: Real-World Scenarios Requirements
- **$\ge 5$ comprehensive multi-step production lifecycle simulations**:
  1. *Bulk Acrylic Keychain Order*: 500 pcs intake with 50% DP $\to$ CorelDraw artwork upload $\to$ operator marks ready $\to$ moves from Antrean to Cetak to Finishing $\to$ full payment received $\to$ marked Selesai $\to$ archived.
  2. *Urgent Screen Printing Run*: 150 pcs Plastisol apparel $\to$ artwork revision replacement $\to$ queue boosted to position 1 $\to$ immediate delivery $\to$ cash settlement.
  3. *Repeat Client Aggregation*: Multiple distinct orders by same customer $\to$ verification of aggregate pcs, omzet, profit, and automatic promotion in Buyer Profit leaderboard.
  4. *Erroneous Entry Deletion*: Order created in error, immediately removed $\to$ queue indices re-compacted without gaps $\to$ financial metrics remain pristine.
  5. *Cold Start & Env Migration*: Application starts with placeholder env vars $\to$ renders setup notice $\to$ credentials configured $\to$ orders sync and render without restarts.

---

## 4. Test Runner Invocation & Pass/Fail Semantics

### 4.1 Commands
The test suite can be run via npm scripts:

```bash
# Run the complete automated test suite across all 4 tiers
npm test

# Run specifically the e2e and integration test suite
npm run test:e2e

# Run with verbose test-by-test logging
npm run test:verbose
```

### 4.2 Runner Execution via `tsx`
Under the hood, the runner executes via `tsx` (TypeScript executor) which resolves all `@/*` module aliases defined in `tsconfig.json` without pre-compilation delays:

```bash
npx tsx tests/run_all.ts
```

### 4.3 Pass/Fail Semantics
- **Zero Tolerated Failures**: Exit code is `0` if and only if **100% of test cases pass**.
- **Exit Code `1` on Any Error**: If any assertion fails or an unhandled rejection occurs, the runner logs the exact assertion diff, file path, line number, and terminates with exit code `1`.
- **Structured Console Report**: The runner prints a formatted summary table displaying:
  - Total tests executed per Tier
  - Passed / Failed / Skipped counts
  - Execution duration in milliseconds
  - Overall status (`PASSED` or `FAILED`)

---

## 5. Mocking Strategy: Supabase Client & Storage

### 5.1 In-Memory Database Store
The mock client emulates the Supabase JavaScript SDK (`@supabase/supabase-js`) with full PostgREST query chaining:
- `.from('orders').select('*').order('queue_order', { ascending: true })`
- `.from('orders').insert(data).select().single()`
- `.from('orders').update(updates).eq('id', id).select().single()`
- `.from('orders').delete().eq('id', id)`
- `.from('order_design_files').insert(fileData)`
- Nested relational selections: `select('*, design_files:order_design_files(*)')`

### 5.2 Storage Mock
The storage mock emulates `supabase.storage.from('design-files')`:
- `.upload(path, fileBuffer, options)` $\to$ generates public URL and validates size limit ($\le$ 50MB).
- `.getPublicUrl(path)` $\to$ returns predictable CDN URL.
- `.remove([path])` $\to$ deletes file from in-memory object storage.

### 5.3 Failure Injection
For Tier 3 optimistic rollback verification, the mock client includes a controllable failure mode:
```ts
mockSupabase.setSimulatedFailure(true); // forces next operation to reject with Error('Network error')
```

---

## 6. Verification & Quality Gates

Before declaring testing infrastructure ready:
1. `npm test` runs all 4 tiers cleanly and returns code 0.
2. `npm run build` succeeds without bundle conflicts.
3. `npm run lint` reports zero ESLint warnings/errors.
4. `npx tsc --noEmit` verifies strict TypeScript types without any errors.
