"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquarePlus } from "lucide-react";

const REGISTRATION_FORM_URL =
  "https://local-spotter-registration-form-xi.vercel.app/";

const BUTTON_WIDTH = 140; // px — wider now that it shows a text label
const BUTTON_HEIGHT = 48; // px
const EDGE_MARGIN = 16; // px, keeps the button from touching the very edge
const DRAG_THRESHOLD = 6; // px of movement before a press counts as a drag
const STORAGE_KEY = "local-spotter:feedback-button-position";

type Position = { x: number; y: number };

function clampPosition(pos: Position): Position {
  if (typeof window === "undefined") return pos;
  const maxX = window.innerWidth - BUTTON_WIDTH - EDGE_MARGIN;
  const maxY = window.innerHeight - BUTTON_HEIGHT - EDGE_MARGIN;
  return {
    x: Math.min(Math.max(pos.x, EDGE_MARGIN), Math.max(maxX, EDGE_MARGIN)),
    y: Math.min(Math.max(pos.y, EDGE_MARGIN), Math.max(maxY, EDGE_MARGIN)),
  };
}

function defaultPosition(): Position {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return clampPosition({
    x: window.innerWidth - BUTTON_WIDTH - EDGE_MARGIN,
    y: window.innerHeight - BUTTON_HEIGHT - EDGE_MARGIN,
  });
}

/**
 * Draggable floating feedback launcher.
 *
 * Rendered once in the root layout so it's available on every page. It can
 * be dragged anywhere on screen (desktop mouse or touch) and its position is
 * remembered between visits via localStorage. A plain click/tap (no drag)
 * opens the Local Spotter shop-owner registration form in a new tab.
 */
export const FeedbackButton: React.FC = () => {
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragMoved = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Restore a saved position (or fall back to bottom-right) once mounted,
  // so we never read `window` during server rendering.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPosition(clampPosition(JSON.parse(saved) as Position));
        return;
      } catch {
        // fall through to default
      }
    }
    setPosition(defaultPosition());
  }, []);

  // Keep the button on-screen if the viewport is resized.
  useEffect(() => {
    function handleResize() {
      setPosition((prev) => (prev ? clampPosition(prev) : prev));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    dragMoved.current = true;
    setPosition(
      clampPosition({
        x: event.clientX - dragOffset.current.x,
        y: event.clientY - dragOffset.current.y,
      }),
    );
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      setPosition((prev) => {
        const next = prev
          ? clampPosition({
              x: event.clientX - dragOffset.current.x,
              y: event.clientY - dragOffset.current.y,
            })
          : prev;
        if (next) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    [handlePointerMove],
  );

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragMoved.current = false;
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setIsDragging(true);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleClick() {
    // If the pointer moved past the threshold we treat this as a drag, not
    // a click, so dragging the button never accidentally opens the form.
    if (dragMoved.current) return;
    window.open(REGISTRATION_FORM_URL, "_blank", "noopener,noreferrer");
  }

  if (!position) return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      aria-label="Feedback geven / winkel aanmelden"
      title="Feedback"
      className="fixed z-[60] flex touch-none items-center gap-2 rounded-full bg-[#FA1EFF] px-5 py-3 text-white shadow-xl ring-4 ring-white transition-transform hover:scale-105 active:scale-95"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      <MessageSquarePlus className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-sm font-semibold whitespace-nowrap">Feedback</span>
    </button>
  );
};
