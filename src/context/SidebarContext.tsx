'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_STORAGE_KEY_WIDTH,
  SIDEBAR_STORAGE_KEY_COLLAPSED,
  clampSidebarWidth,
  detectSwipeGesture,
} from '@/lib/sidebar';

export interface SidebarContextType {
  width: number;
  isCollapsed: boolean;
  isDragging: boolean;
  isMobileOpen: boolean;
  setWidth: (width: number) => void;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleCollapsed: () => void;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
  setIsDragging: (isDragging: boolean) => void;
  resetWidth: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Default states match SSR to guarantee zero hydration mismatch
  const [width, setWidthState] = useState<number>(SIDEBAR_DEFAULT_WIDTH);
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Auto-close mobile drawer on route transitions during render (React recommended pattern)
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileOpen(false);
  }

  // SSR-safe client initialization: asynchronous with unmount guard to prevent cascading renders
  useEffect(() => {
    let isMounted = true;

    async function loadSavedPreferences() {
      try {
        const savedWidth = localStorage.getItem(SIDEBAR_STORAGE_KEY_WIDTH);
        if (savedWidth !== null && isMounted) {
          const parsed = Number(savedWidth);
          if (!isNaN(parsed) && parsed > 0) {
            setWidthState(clampSidebarWidth(parsed));
          }
        }
        const savedCollapsed = localStorage.getItem(SIDEBAR_STORAGE_KEY_COLLAPSED);
        if (savedCollapsed !== null && isMounted) {
          setIsCollapsedState(savedCollapsed === 'true');
        }
      } catch {
        // Ignore if localStorage is unavailable or disabled
      }
    }

    void loadSavedPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  const setWidth = useCallback((newWidth: number) => {
    const clamped = clampSidebarWidth(newWidth);
    setWidthState(clamped);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY_WIDTH, String(clamped));
    } catch {
      // Ignore
    }
  }, []);

  const setIsCollapsed = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setIsCollapsedState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY_COLLAPSED, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY_COLLAPSED, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const resetWidth = useCallback(() => {
    setWidth(SIDEBAR_DEFAULT_WIDTH);
  }, [setWidth]);

  const openMobile = useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  const closeMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const toggleMobile = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  // Lock body scroll when mobile drawer is open, restore on close or unmount
  useEffect(() => {
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileOpen]);

  // Listen for Escape key to dismiss mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen]);

  // Global touch swipe-to-open gesture handler from window edge (startX <= 30, deltaX >= 50)
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const gesture = detectSwipeGesture({ x: startX, y: startY }, { x: endX, y: endY });
        if (gesture === 'OPEN_MOBILE') {
          setIsMobileOpen(true);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        width,
        isCollapsed,
        isDragging,
        isMobileOpen,
        setWidth,
        setIsCollapsed,
        toggleCollapsed,
        openMobile,
        closeMobile,
        toggleMobile,
        setIsDragging,
        resetWidth,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextType {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
