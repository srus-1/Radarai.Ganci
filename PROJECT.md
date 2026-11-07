# Project: eganci Admin & Production Order Management Mobile & Sidebar Redesign

## Architecture
The application is built on Next.js 16 (App Router), React 19, and Tailwind CSS v4.
State management is partitioned into:
1. `OrderContext` (`src/context/OrderContext.tsx`): Exclusively manages domain orders, filters, search queries, modals, metrics, and Supabase mutations.
2. `SidebarContext` (`src/context/SidebarContext.tsx`): Exclusively manages navigation state, desktop sidebar width clamping [200px, 360px], collapsed rail state (68px), dragging state, and mobile off-canvas drawer open/close state, eliminating unnecessary domain re-renders.
3. Pure Helper Module (`src/lib/sidebar.ts`): Houses pure deterministic mathematical functions for width clamping, snap-collapse threshold resolution (< 140px), reducer state machine, and touch swipe gesture detection, ensuring 100% headless testability.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Pure Sidebar Mathematics & Constants | Clamping [200, 360], snap threshold < 140px, rail width 68px, swipe detection | M1 | Survey 1, 3 |
| 2 | Sidebar State Context & Hook | `SidebarProvider`, `useSidebar`, preference sync, body scroll lock, route listener | M1 | Survey 1 |
| 3 | Desktop Resizable & Collapsible Sidebar | Drag handle with Notion purple feedback, compact icon rail with navy tooltips | M1 | Survey 1 |
| 4 | Mobile Off-Canvas Sidebar Drawer | 0px document flow on < 768px, slide-over drawer with dimmed backdrop overlay | M1 | Survey 1 |
| 5 | Mobile Navigation Trigger in TopHeader | Accessible hamburger toggle button (min 44px tap area) and responsive header | M1 | Survey 1, 2 |
| 6 | Touch Gesture Swipe Open & Close | Left edge swipe right (startX <= 30, deltaX >= 50) to open, swipe left to close | M1 | Survey 1, 3 |
| 7 | Order Sortable List Touch Scroll Fix | Remove `touch-none` from row wrapper, isolate to drag handle, restore vertical page scroll | M2 | Survey 2 |
| 8 | OrderRowCard Mobile Responsive Layout | 2-column footer dropdown grid, no-collision Desain button, 36-40px touch targets | M2 | Survey 2 |
| 9 | OrderFilterTabs Mobile Adaptations | Horizontal touch scroll `scrollbar-none`, touch-friendly tab heights, responsive date filter | M2 | Survey 2 |
| 10 | Hero Banners Stacking & Responsive Padding | Responsive padding `p-4 sm:p-5 md:p-6`, action wrapping, responsive typography | M2 | Survey 2 |
| 11 | Dashboard KPIs & Chart Tooltips | Metric cards truncation fix, multi-line wrapping tooltip card, mobile SVG bar tap handler | M2 | Survey 2 |
| 12 | Buyer & History Dual-View Data Tables | Mobile card stack on < 768px + desktop table on >= 768px, zero page horizontal scroll | M2 | Survey 2 |
| 13 | OrderFormModal Mobile Bottom Sheet | Mobile bottom sheet with drag pill, sticky header & footer, `inputMode="numeric"`, auto-select focus | M3 | Survey 3 |
| 14 | OrderDesignDrawer Mobile Bottom Sheet | Bottom sheet on < 640px, sticky header/footer, enlarged touch targets for actions | M3 | Survey 3 |
| 15 | LightboxModal Responsive Safe Area | Mobile header title truncation, bottom safe area padding, 44px tap targets | M3 | Survey 3 |
| 16 | Programmatic Test Suite (`tests/mobile_sidebar.test.ts`) | 25+ automated tests for clamping, snap threshold, state machine, swipe gestures, overflow helpers | M4 | Survey 1, 3 |
| 17 | Test Suite Integration & Quality Gates | Integrate into `tests/run_all.ts`, verify 100% pass on 80+ tests, contrast suite, lint, tsc, build | M4 | Survey 1, 2, 3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Desktop Resizable Sidebar & Mobile Off-Canvas Drawer | Features 1–6: `sidebar.ts`, `SidebarContext.tsx`, `Sidebar.tsx`, `TopHeader.tsx`, `layout.tsx` | none | DONE |
| M2 | Responsive Views, Hero Banners, Order Queue & Data Tables | Features 7–12: `OrderSortableList.tsx`, `OrderRowCard.tsx`, `OrderFilterTabs.tsx`, Hero banners, `MetricCards.tsx`, `MonthlyProfitChart.tsx`, `BuyerProfitTable.tsx`, `history/page.tsx` | M1 | DONE |
| M3 | Mobile Bottom-Sheet Modals & Drawers | Features 13–15: `OrderFormModal.tsx`, `OrderDesignDrawer.tsx`, `LightboxModal.tsx` | M1 | IN_PROGRESS |
| M4 | Automated Test Suite, WCAG AA Contrast & Quality Gates | Features 16–17: `tests/mobile_sidebar.test.ts`, `tests/run_all.ts`, contrast verification, lint, tsc, build | M1, M2, M3 | PLANNED |

## Interface Contracts
### `src/lib/sidebar.ts`
- `clampSidebarWidth(width: number): number` (clamps `[200, 360]`)
- `resolveSidebarDrag(rawWidth: number): { isCollapsed: boolean; width: number }` (snap < 140px -> `{ isCollapsed: true, width: 68 }`, else clamped)
- `sidebarReducer(state: SidebarState, action: SidebarAction): SidebarState`
- `detectSwipeGesture(start: { x: number; y: number }, end: { x: number; y: number }): 'OPEN_MOBILE' | 'CLOSE_MOBILE' | null`
- `isMobileViewport(width: number): boolean`
- `checkHorizontalOverflow(scrollWidth: number, innerWidth: number): boolean`

### `src/context/SidebarContext.tsx`
- `width: number` (200..360, default 256)
- `isCollapsed: boolean`
- `isDragging: boolean`
- `isMobileOpen: boolean`
- `setWidth: (w: number) => void`
- `toggleCollapsed: () => void`
- `openMobile: () => void`
- `closeMobile: () => void`
- `toggleMobile: () => void`
- `setIsDragging: (d: boolean) => void`

## Code Layout
- `src/lib/sidebar.ts`: Sidebar pure logic & mathematical helpers
- `src/context/SidebarContext.tsx`: Sidebar navigation provider and consumer hook
- `src/components/layout/Sidebar.tsx`: Desktop resizable/collapsible rail + mobile drawer
- `src/components/layout/TopHeader.tsx`: Responsive navigation header with hamburger trigger
- `src/app/layout.tsx`: Root layout with `SidebarProvider` and responsive main padding
- `src/components/order/OrderSortableList.tsx`: Order queue DnD wrapper with touch-pan-y
- `src/components/order/OrderRowCard.tsx`: Order item card with isolated touch-none drag handle
- `src/components/order/OrderFilterTabs.tsx`: Responsive tab list
- `src/components/dashboard/MetricCards.tsx`: Responsive KPI cards
- `src/components/dashboard/MonthlyProfitChart.tsx`: Responsive monthly chart & tooltip
- `src/components/dashboard/BuyerProfitTable.tsx`: Dual-view buyer profit table / cards
- `src/app/order/page.tsx`: Order queue page shell
- `src/app/dashboard/page.tsx`: Dashboard page shell
- `src/app/history/page.tsx`: History page shell & dual-view table / cards
- `src/components/order/OrderFormModal.tsx`: Mobile bottom-sheet order form modal
- `src/components/order/OrderDesignDrawer.tsx`: Mobile bottom-sheet design drawer
- `src/components/shared/LightboxModal.tsx`: Responsive image preview modal
- `tests/mobile_sidebar.test.ts`: Programmatic test suite
- `tests/run_all.ts`: Master test runner
