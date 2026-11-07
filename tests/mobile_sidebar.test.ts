// Programmatic Test Suite for Sidebar Math, Drag Resolution, Swipe Gestures & State Reducer
// Executable via: npx tsx --test tests/mobile_sidebar.test.ts

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_SNAP_THRESHOLD,
  clampSidebarWidth,
  resolveSidebarDrag,
  sidebarReducer,
  detectSwipeGesture,
  isMobileViewport,
  checkHorizontalOverflow,
  shouldOpenFromSwipe,
  shouldCloseFromSwipe,
  SidebarState,
} from '../src/lib/sidebar';

describe('Sidebar Math & Drag Resizing (R1)', () => {
  test('T1-SB-01: Clamps width strictly within [200, 360]', () => {
    assert.equal(clampSidebarWidth(100), 200);
    assert.equal(clampSidebarWidth(199), 200);
    assert.equal(clampSidebarWidth(200), 200);
    assert.equal(clampSidebarWidth(256), 256);
    assert.equal(clampSidebarWidth(360), 360);
    assert.equal(clampSidebarWidth(500), 360);
    assert.equal(clampSidebarWidth(-50), 200);
  });

  test('T1-SB-02: Snaps to rail (< 140px) and clamps (>= 140px)', () => {
    assert.deepEqual(resolveSidebarDrag(139), { isCollapsed: true, width: 68 });
    assert.deepEqual(resolveSidebarDrag(139.9), { isCollapsed: true, width: 68 });
    assert.deepEqual(resolveSidebarDrag(140), { isCollapsed: false, width: 200 });
    assert.deepEqual(resolveSidebarDrag(280), { isCollapsed: false, width: 280 });
    assert.deepEqual(resolveSidebarDrag(400), { isCollapsed: false, width: 360 });
    assert.deepEqual(resolveSidebarDrag(-10), { isCollapsed: true, width: 68 });
  });

  test('T1-SB-03: Fractional width values round cleanly to nearest integer', () => {
    assert.equal(clampSidebarWidth(210.4), 210);
    assert.equal(clampSidebarWidth(210.6), 211);
    assert.equal(clampSidebarWidth(199.6), 200);
  });
});

describe('Mobile Touch Gestures & Drawer Logic (R2)', () => {
  test('T1-MB-01: Swipe right from left edge (startX <= 30, deltaX >= 50) triggers OPEN_MOBILE', () => {
    assert.equal(detectSwipeGesture({ x: 20, y: 150 }, { x: 80, y: 150 }), 'OPEN_MOBILE');
    assert.equal(detectSwipeGesture({ x: 30, y: 150 }, { x: 80, y: 150 }), 'OPEN_MOBILE');
    assert.equal(shouldOpenFromSwipe(30, 50, 0), true);
  });

  test('T1-MB-02: Non-edge or insufficient swipes do not trigger OPEN_MOBILE', () => {
    // startX > 30 (not edge)
    assert.equal(detectSwipeGesture({ x: 35, y: 150 }, { x: 100, y: 150 }), null);
    assert.equal(shouldOpenFromSwipe(31, 50, 0), false);

    // deltaX < 50 (insufficient distance)
    assert.equal(detectSwipeGesture({ x: 15, y: 150 }, { x: 50, y: 150 }), null);
    assert.equal(shouldOpenFromSwipe(20, 49, 0), false);
  });

  test('T1-MB-03: Swipe left (deltaX <= -50) triggers CLOSE_MOBILE', () => {
    assert.equal(detectSwipeGesture({ x: 200, y: 150 }, { x: 150, y: 150 }), 'CLOSE_MOBILE');
    assert.equal(detectSwipeGesture({ x: 250, y: 150 }, { x: 120, y: 150 }), 'CLOSE_MOBILE');
    assert.equal(shouldCloseFromSwipe(-50, 0), true);
    assert.equal(shouldCloseFromSwipe(-49, 0), false);
  });

  test('T1-MB-04: Diagonal or vertical scrolling gestures (|deltaY| >= |deltaX|) are ignored', () => {
    assert.equal(detectSwipeGesture({ x: 20, y: 100 }, { x: 80, y: 160 }), null); // deltaX=60, deltaY=60
    assert.equal(detectSwipeGesture({ x: 20, y: 100 }, { x: 80, y: 180 }), null); // deltaX=60, deltaY=80
    assert.equal(shouldOpenFromSwipe(20, 60, 60), false);
    assert.equal(shouldCloseFromSwipe(-60, 60), false);
  });

  test('T1-MB-05: Reverse and stationary touch interactions return null', () => {
    assert.equal(detectSwipeGesture({ x: 100, y: 100 }, { x: 100, y: 100 }), null);
    assert.equal(detectSwipeGesture({ x: 100, y: 100 }, { x: 100, y: 300 }), null);
  });
});

describe('Sidebar State Machine Reducer', () => {
  const initialState: SidebarState = {
    width: SIDEBAR_DEFAULT_WIDTH,
    isCollapsed: false,
    isMobileOpen: false,
    isDragging: false,
  };

  test('T1-SM-01: Correctly processes INIT, TOGGLE_MOBILE, OPEN_MOBILE, CLOSE_MOBILE', () => {
    const s1 = sidebarReducer(initialState, { type: 'OPEN_MOBILE' });
    assert.equal(s1.isMobileOpen, true);

    const s2 = sidebarReducer(s1, { type: 'CLOSE_MOBILE' });
    assert.equal(s2.isMobileOpen, false);

    const s3 = sidebarReducer(s2, { type: 'TOGGLE_MOBILE' });
    assert.equal(s3.isMobileOpen, true);

    const s4 = sidebarReducer(s3, { type: 'NAVIGATE', payload: '/dashboard' });
    assert.equal(s4.isMobileOpen, false);
  });

  test('T1-SM-02: Correctly processes collapse toggles and width updates', () => {
    const s1 = sidebarReducer(initialState, { type: 'TOGGLE_COLLAPSE' });
    assert.equal(s1.isCollapsed, true);
    assert.equal(s1.width, SIDEBAR_COLLAPSED_WIDTH);

    const s2 = sidebarReducer(s1, { type: 'TOGGLE_COLLAPSE' });
    assert.equal(s2.isCollapsed, false);
    assert.equal(s2.width, SIDEBAR_DEFAULT_WIDTH);

    const s3 = sidebarReducer(initialState, { type: 'SET_WIDTH', payload: 320 });
    assert.equal(s3.width, 320);
    assert.equal(s3.isCollapsed, false);

    const s4 = sidebarReducer(s3, { type: 'SET_WIDTH', payload: 120 });
    assert.equal(s4.width, SIDEBAR_COLLAPSED_WIDTH);
    assert.equal(s4.isCollapsed, true);
  });

  test('T1-SM-03: SET_DRAGGING toggles dragging flag', () => {
    const s1 = sidebarReducer(initialState, { type: 'SET_DRAGGING', payload: true });
    assert.equal(s1.isDragging, true);

    const s2 = sidebarReducer(s1, { type: 'SET_DRAGGING', payload: false });
    assert.equal(s2.isDragging, false);
  });
});

describe('Viewport & Horizontal Overflow Verification', () => {
  test('T1-VP-01: Correctly classifies mobile (< 768px) and desktop (>= 768px) viewports', () => {
    assert.equal(isMobileViewport(320), true);
    assert.equal(isMobileViewport(375), true);
    assert.equal(isMobileViewport(767), true);
    assert.equal(isMobileViewport(768), false);
    assert.equal(isMobileViewport(1024), false);
  });

  test('T1-VP-02: checkHorizontalOverflow validates zero horizontal overflow', () => {
    assert.equal(checkHorizontalOverflow(360, 360), true);
    assert.equal(checkHorizontalOverflow(350, 360), true);
    assert.equal(checkHorizontalOverflow(361, 360), false);
  });
});
