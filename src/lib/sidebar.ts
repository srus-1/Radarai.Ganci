// Pure mathematical and deterministic state functions for Sidebar navigation
// Free of React / DOM dependencies for 100% headless testability

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 360;
export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_COLLAPSED_WIDTH = 68;
export const SIDEBAR_SNAP_THRESHOLD = 140;

export const SIDEBAR_STORAGE_KEY_WIDTH = 'eganci_sidebar_width';
export const SIDEBAR_STORAGE_KEY_COLLAPSED = 'eganci_sidebar_collapsed';

export const MIN_SWIPE_DISTANCE = 50;
export const MAX_EDGE_START_X = 30;

export interface SidebarState {
  width: number;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  isDragging?: boolean;
}

export type SidebarAction =
  | { type: 'INIT' }
  | { type: 'TOGGLE_MOBILE' }
  | { type: 'OPEN_MOBILE' }
  | { type: 'CLOSE_MOBILE' }
  | { type: 'TOGGLE_COLLAPSE' }
  | { type: 'SET_COLLAPSED'; payload: boolean }
  | { type: 'SET_WIDTH'; payload: number }
  | { type: 'SET_DRAGGING'; payload: boolean }
  | { type: 'NAVIGATE'; payload?: string };

/**
 * Clamps raw sidebar width strictly within [SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH] (200px - 360px).
 */
export function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
}

/**
 * Resolves a dragged width against the snap threshold (140px).
 * If dragged below 140px, snaps to collapsed rail (68px).
 * If >= 140px, clamps to normal range [200px, 360px].
 */
export function resolveSidebarDrag(rawWidth: number): { isCollapsed: boolean; width: number } {
  if (rawWidth < SIDEBAR_SNAP_THRESHOLD) {
    return { isCollapsed: true, width: SIDEBAR_COLLAPSED_WIDTH };
  }
  return { isCollapsed: false, width: clampSidebarWidth(rawWidth) };
}

/**
 * Deterministic reducer state machine for sidebar actions.
 */
export function sidebarReducer(state: SidebarState, action: SidebarAction): SidebarState {
  switch (action.type) {
    case 'INIT':
      return { ...state };
    case 'TOGGLE_MOBILE':
      return { ...state, isMobileOpen: !state.isMobileOpen };
    case 'OPEN_MOBILE':
      return { ...state, isMobileOpen: true };
    case 'CLOSE_MOBILE':
    case 'NAVIGATE':
      return { ...state, isMobileOpen: false };
    case 'TOGGLE_COLLAPSE': {
      const nextCollapsed = !state.isCollapsed;
      return {
        ...state,
        isCollapsed: nextCollapsed,
        width: nextCollapsed ? SIDEBAR_COLLAPSED_WIDTH : (state.width === SIDEBAR_COLLAPSED_WIDTH ? SIDEBAR_DEFAULT_WIDTH : state.width),
      };
    }
    case 'SET_COLLAPSED':
      return {
        ...state,
        isCollapsed: action.payload,
        width: action.payload ? SIDEBAR_COLLAPSED_WIDTH : (state.width === SIDEBAR_COLLAPSED_WIDTH ? SIDEBAR_DEFAULT_WIDTH : state.width),
      };
    case 'SET_WIDTH': {
      const resolved = resolveSidebarDrag(action.payload);
      return { ...state, ...resolved };
    }
    case 'SET_DRAGGING':
      return { ...state, isDragging: action.payload };
    default:
      return state;
  }
}

/**
 * Detects touch swipe gestures for mobile off-canvas drawer.
 * - OPEN_MOBILE: Swipe right starting from left edge (startX <= 30, deltaX >= 50, |deltaX| > |deltaY|).
 * - CLOSE_MOBILE: Swipe left (deltaX <= -50, |deltaX| > |deltaY|).
 */
export function detectSwipeGesture(
  start: { x: number; y: number },
  end: { x: number; y: number },
  options: { edgeThreshold?: number; minDistance?: number } = {}
): 'OPEN_MOBILE' | 'CLOSE_MOBILE' | null {
  const edgeThreshold = options.edgeThreshold ?? MAX_EDGE_START_X;
  const minDistance = options.minDistance ?? MIN_SWIPE_DISTANCE;

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  // Vertical scroll dominant - ignore gesture
  if (Math.abs(deltaY) >= Math.abs(deltaX)) {
    return null;
  }

  // Edge swipe right to open
  if (start.x <= edgeThreshold && deltaX >= minDistance) {
    return 'OPEN_MOBILE';
  }

  // Swipe left to close
  if (deltaX <= -minDistance) {
    return 'CLOSE_MOBILE';
  }

  return null;
}

/**
 * Helper to determine if a viewport width qualifies as mobile (< 768px).
 */
export function isMobileViewport(width: number): boolean {
  return width < 768;
}

/**
 * Verifies that the container or window does not experience horizontal overflow.
 */
export function checkHorizontalOverflow(scrollWidth: number, innerWidth: number): boolean {
  return scrollWidth <= innerWidth;
}

/**
 * Convenience helper for swipe open evaluation.
 */
export function shouldOpenFromSwipe(startX: number, deltaX: number, deltaY: number): boolean {
  return startX <= MAX_EDGE_START_X && deltaX >= MIN_SWIPE_DISTANCE && Math.abs(deltaX) > Math.abs(deltaY);
}

/**
 * Convenience helper for swipe close evaluation.
 */
export function shouldCloseFromSwipe(deltaX: number, deltaY: number): boolean {
  return deltaX <= -MIN_SWIPE_DISTANCE && Math.abs(deltaX) > Math.abs(deltaY);
}
