"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Home, Store, Package } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import type { FulfilmentMethod, OrderStatus } from "@/types/order";
import { currentStepIndex, routeProgress, trackerSteps } from "./orderProgress";

const ROUTE = "M34 82 C 84 18, 138 112, 188 64 S 262 40, 288 30";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Eases a 0..1 value towards `target`; while a parcel is out for delivery it keeps drifting along the route. */
function useRouteProgress(target: number, drifting: boolean): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (prefersReducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const wobble = drifting ? Math.sin((now - start) / 1400) * 0.13 : 0;
      const goal = Math.min(1, Math.max(0, target + wobble));
      const next = current.current + (goal - current.current) * 0.06;
      current.current = Math.abs(goal - next) < 0.0005 && !drifting ? goal : next;
      setValue(current.current);
      if (drifting || current.current !== goal) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, drifting]);
  return value;
}

interface Props {
  status: OrderStatus;
  method: FulfilmentMethod;
  businessName: string;
  /** Start expanded (used for orders that are still in progress). */
  defaultOpen?: boolean;
}

/**
 * Order progress: a step timeline plus, for deliveries, an animated route from the shop to the customer.
 * Progress is derived from the order status that the shop updates; it is not live courier tracking.
 */
export function OrderTracker({ status, method, businessName, defaultOpen = false }: Props) {
  const { t, label } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const steps = trackerSteps(method);
  const index = currentStepIndex(status, method);
  const failed = index === -1;
  const delivery = method !== "PICKUP";
  const target = routeProgress(status);
  const progress = useRouteProgress(target, status === "OUT_FOR_DELIVERY");
  const pathRef = useRef<SVGPathElement>(null);
  const [marker, setMarker] = useState({ x: 34, y: 82 });

  useEffect(() => {
    const path = pathRef.current;
    if (!path || typeof path.getTotalLength !== "function") return;
    const p = path.getPointAtLength(path.getTotalLength() * progress);
    setMarker({ x: p.x, y: p.y });
  }, [progress]);

  const stepLabel = (s: (typeof steps)[number]) => (s.pickupLabel ? t("status.READY_PICKUP") : label("status", s.status));
  const headline = failed ? label("status", status) : stepLabel(steps[index]);

  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-[#F9F9F9]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-[#111111]">
          <Package className="h-4 w-4 text-[#FA1EFF]" aria-hidden="true" />
          {t("orders.tracker.title")}
          <span className="font-medium text-[#6B6B6B]">· {headline}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-[#6B6B6B] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="space-y-4 border-t border-[#EAEAEA] px-4 pb-4 pt-4">
          {failed ? (
            <p role="status" className="rounded-xl bg-[#F2D9DE]/60 p-3 text-xs font-bold text-[#8A2433]">
              {t("orders.tracker.stopped", { status: label("status", status) })}
            </p>
          ) : (
            <>
              <ol className="flex items-start" aria-label={t("orders.tracker.title")}>
                {steps.map((s, i) => {
                  const done = i < index || (i === index && s.status === "DELIVERED");
                  const here = i === index && !done;
                  return (
                    <li key={s.status} className="relative flex-1 text-center" aria-current={here ? "step" : undefined}>
                      {i > 0 && (
                        <span aria-hidden="true" className="absolute left-[-50%] right-[50%] top-3 h-0.5 bg-[#EAEAEA]">
                          <span className="block h-full bg-[#FA1EFF] transition-all duration-700" style={{ width: i <= index ? "100%" : "0%" }} />
                        </span>
                      )}
                      <span
                        className={`relative mx-auto flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors duration-500 ${
                          done ? "border-[#FA1EFF] bg-[#FA1EFF] text-white" : here ? "border-[#FA1EFF] bg-white text-[#FA1EFF]" : "border-[#EAEAEA] bg-white text-[#B7B7B7]"
                        }`}
                      >
                        {here && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-[#FA1EFF]/30 motion-reduce:hidden" />}
                        {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                      </span>
                      <span className={`mt-1.5 block px-0.5 text-[10px] leading-tight ${here || done ? "font-bold text-[#111111]" : "text-[#6B6B6B]"}`}>{stepLabel(s)}</span>
                    </li>
                  );
                })}
              </ol>

              {delivery ? (
                <div>
                  <svg viewBox="0 0 320 110" role="img" aria-label={t("orders.tracker.mapLabel", { shop: businessName, status: headline })} className="w-full rounded-xl bg-[#EAF3E4]">
                    {/* Map-like backdrop: blocks and streets. */}
                    <g stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0.9">
                      <path d="M0 22 H320" />
                      <path d="M0 92 H320" />
                      <path d="M70 0 V110" />
                      <path d="M168 0 V110" />
                      <path d="M250 0 V110" />
                    </g>
                    <g fill="#D4E6C8">
                      <rect x="80" y="30" width="80" height="54" rx="6" />
                      <rect x="178" y="30" width="64" height="54" rx="6" />
                      <rect x="258" y="30" width="54" height="54" rx="6" />
                    </g>
                    <path d={ROUTE} fill="none" stroke="#B7B7B7" strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" />
                    <path d={ROUTE} fill="none" stroke="#FA1EFF" strokeWidth="4" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />
                    <path ref={pathRef} d={ROUTE} fill="none" stroke="none" />
                    {/* Shop and home pins */}
                    <circle cx="34" cy="82" r="11" fill="#111111" />
                    <circle cx="288" cy="30" r="11" fill={status === "DELIVERED" ? "#3B9B52" : "#790166"} />
                    {/* Parcel marker */}
                    <g transform={`translate(${marker.x} ${marker.y})`}>
                      {status === "OUT_FOR_DELIVERY" && <circle r="12" fill="#FA1EFF" opacity="0.25" className="animate-ping motion-reduce:hidden" />}
                      <circle r="7" fill="#FFFFFF" stroke="#FA1EFF" strokeWidth="3" />
                    </g>
                  </svg>
                  {/* Pins as HTML so the icons use the lucide set. */}
                  <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-[#111111]">
                    <span className="flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5" aria-hidden="true" /> {businessName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {t("orders.tracker.you")} <Home className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl bg-white p-3 text-xs text-[#555555]">
                  {status === "READY" ? t("orders.tracker.readyPickup", { shop: businessName }) : status === "DELIVERED" ? t("orders.tracker.pickedUp") : t("orders.tracker.pickupWait", { shop: businessName })}
                </p>
              )}
              <p className="text-[10px] text-[#6B6B6B]">{t("orders.tracker.note")}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
