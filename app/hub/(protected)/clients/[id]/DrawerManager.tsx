"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* ── DrawerManager — manages a stack of right-edge drawers.
   Implements the mockup's drawer standard:
   · Max 2 levels deep (MAX_DEPTH); third open force-closes the top
   · Dismiss: Esc, scrim click, X
   · Focus moves to heading on open, returns to opener on close
   · Page never scrolls behind a drawer */

const MAX_DEPTH = 2;

interface DrawerManagerValue {
  openDrawer: (id: string, opener?: HTMLElement | null) => void;
  openWorkoutDrawer: (sessionId: string, opener?: HTMLElement | null) => void;
  closeDrawer: () => void;
  activeDrawer: string | null;
  parentId: string | null;
  selectedSessionId: string | null;
}

const DrawerManagerCtx = createContext<DrawerManagerValue>({
  openDrawer: () => {},
  openWorkoutDrawer: () => {},
  closeDrawer: () => {},
  activeDrawer: null,
  parentId: null,
  selectedSessionId: null,
});

export function useDrawerManager() {
  return useContext(DrawerManagerCtx);
}

/* ── Provider ─────────────────────────────────────────────────────────────── */

export function DrawerManager({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const parentOpenerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const openDrawer = useCallback((id: string, opener?: HTMLElement | null) => {
    if (activeId) {
      if (parentId) {
        // Already at MAX_DEPTH — force-close the top drawer before stacking
        setActiveId(parentId);
        setParentId(null);
        parentOpenerRef.current = null;
      }
      // Stack one level deep
      setParentId(activeId);
      parentOpenerRef.current = openerRef.current;
      setActiveId(id);
      openerRef.current = opener ?? null;
    } else {
      setActiveId(id);
      openerRef.current = opener ?? null;
    }
  }, [activeId, parentId]);

  const openWorkoutDrawer = useCallback((sessionId: string, opener?: HTMLElement | null) => {
    setSelectedSessionId(sessionId);
    if (activeId) {
      if (parentId) {
        setActiveId(parentId);
        setParentId(null);
        parentOpenerRef.current = null;
      }
      setParentId(activeId);
      parentOpenerRef.current = openerRef.current;
      setActiveId("dw-workout");
      openerRef.current = opener ?? null;
    } else {
      setActiveId("dw-workout");
      openerRef.current = opener ?? null;
    }
  }, [activeId, parentId]);

  const closeDrawer = useCallback(() => {
    if (parentId) {
      // Close child, return to parent
      setActiveId(parentId);
      setParentId(null);
      // Focus the parent heading
      setTimeout(() => {
        const parentEl = document.querySelector(`[data-drawer-id="${parentId}"]`);
        const h = parentEl?.querySelector<HTMLElement>("h3");
        if (h) h.focus({ preventScroll: true });
      }, 50);
    } else {
      // Close everything
      const opener = openerRef.current;
      setActiveId(null);
      setParentId(null);
      setSelectedSessionId(null);
      openerRef.current = null;
      parentOpenerRef.current = null;
      // Return focus to opener
      setTimeout(() => {
        if (opener && typeof opener.focus === "function") {
          opener.focus({ preventScroll: true });
        }
      }, 50);
    }
  }, [parentId]);

  // Esc to dismiss
  useEffect(() => {
    if (!activeId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeId, closeDrawer]);

  // Lock body scroll when a drawer is open
  useEffect(() => {
    if (activeId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [activeId]);

  return (
    <DrawerManagerCtx.Provider value={{ openDrawer, openWorkoutDrawer, closeDrawer, activeDrawer: activeId, parentId, selectedSessionId }}>
      {children}
      {/* Scrim */}
      <div
        className={cn(
          "fixed inset-0 bg-[var(--color-ink)]/40 transition-opacity duration-200 z-40",
          activeId ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={closeDrawer}
      />
    </DrawerManagerCtx.Provider>
  );
}

/* ── Drawer shell ───────────────────────────────────────────────────────────
   Each drawer is a fixed right-edge panel. Only the active one slides in.
   The parent (if any) gets pushed left 24px via the `pushed` class. */

interface DrawerShellProps {
  id: string;
  title: string;
  subtitle?: string;
  width?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const WIDTHS = { sm: "w-[420px]", md: "w-[560px]", lg: "w-[720px]" };

export function DrawerShell({ id, title, subtitle, width = "md", children }: DrawerShellProps) {
  const { activeDrawer, parentId, closeDrawer } = useDrawerManager();
  const isActive = activeDrawer === id;
  const isParent = parentId === id && activeDrawer !== null;
  const isOpen = isActive || isParent;

  const headingRef = useRef<HTMLHeadingElement>(null);

  // Focus heading on open
  useEffect(() => {
    if (isActive && headingRef.current) {
      headingRef.current.focus({ preventScroll: true });
    }
  }, [isActive]);

  return (
    <aside
      data-drawer-id={id}
      role="dialog"
      aria-modal={isActive}
      aria-labelledby={`${id}-heading`}
      className={cn(
        "fixed top-0 right-0 h-full bg-white shadow-[-8px_0_32px_rgba(16,24,40,.10),_-2px_0_8px_rgba(16,24,40,.06)] flex flex-col z-50 transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)]",
        WIDTHS[width],
        "max-w-[96vw]",
        isActive ? "translate-x-0" : isParent ? "-translate-x-6" : "translate-x-full"
      )}
      style={{ zIndex: isActive ? 50 : 49 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-[var(--hub-border)] shrink-0">
        <div className="min-w-0 flex-1">
          {isParent && parentId && (
            <button
              onClick={closeDrawer}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-rose)] hover:underline underline-offset-2 mb-0.5 bg-transparent border-0 p-0 cursor-pointer font-[inherit]"
            >
              ‹ Back
            </button>
          )}
          <h3
            ref={headingRef}
            id={`${id}-heading`}
            tabIndex={-1}
            className="m-0 text-[15.5px] font-bold text-[var(--color-ink)] tracking-tight outline-none"
          >
            {title}
          </h3>
          {subtitle && (
            <span className="block text-xs text-[var(--color-muted)] mt-0.5">{subtitle}</span>
          )}
        </div>
        <button
          onClick={closeDrawer}
          className="w-8 h-8 rounded-lg border-0 bg-transparent text-[var(--color-muted)] cursor-pointer grid place-items-center text-lg leading-none shrink-0 hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)]"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {children}
      </div>
    </aside>
  );
}

/* ── Convenience hook for opening drawers from buttons ─────────────────────── */

export function useOpenDrawer() {
  const { openDrawer } = useDrawerManager();
  return useCallback((id: string, e?: React.MouseEvent) => {
    openDrawer(id, e?.currentTarget as HTMLElement);
  }, [openDrawer]);
}
