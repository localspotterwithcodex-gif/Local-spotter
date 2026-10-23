"use client";

import React, { useId, useRef, useState } from "react";

/** Admin-portal palette (matches the analytics reference): dark magenta → pink → lavender. */
export const CHART_COLORS = {
  primary: "#790166",
  secondary: "#F4A6D7",
  tertiary: "#E8D1ED",
  accent: "#C04BDA",
  grid: "#EEEEEE",
  axis: "#B7B7B7",
  ink: "#111111",
};

/** Rounds a maximum up to 1, 2, 5 × 10ⁿ so axis ticks are readable. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * exp;
}

const ticks = (max: number, count = 4) => Array.from({ length: count + 1 }, (_, i) => (max / count) * i);
const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k`.replace(".0k", "k") : String(Math.round(n * 10) / 10));

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  // x/y in % of the chart box; flip to the left side near the right edge.
  const flip = x > 60;
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2 text-[11px] shadow-md"
      style={{ left: `${x}%`, top: `${Math.max(2, y)}%`, transform: flip ? "translate(calc(-100% - 12px), 0)" : "translate(12px, 0)", minWidth: width }}
    >
      {children}
    </div>
  );
}

function SrTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#555555]">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden="true" /> {label}
    </span>
  );
}

// ---------------------------------------------------------------- line chart (revenue + orders)

export interface TrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface TrendProps {
  data: TrendPoint[];
  title: string;
  labels: { revenue: string; orders: string; date: string };
  formatMoney: (n: number) => string;
  formatDay: (iso: string) => string;
  empty: string;
}

/** Revenue (left axis) and orders (right axis) per day, as in the reference. Hover for exact values. */
export function TrendChart({ data, title, labels, formatMoney, formatDay, empty }: TrendProps) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const W = 640, H = 250, L = 52, R = 40, T = 12, B = 28;
  const iw = W - L - R, ih = H - T - B;
  const maxRev = niceMax(Math.max(0, ...data.map((d) => d.revenue)));
  const maxOrd = niceMax(Math.max(0, ...data.map((d) => d.orders)));
  const x = (i: number) => L + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const yRev = (v: number) => T + ih - (v / maxRev) * ih;
  const yOrd = (v: number) => T + ih - (v / maxOrd) * ih;
  const path = (fn: (d: TrendPoint) => number) => data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${fn(d).toFixed(1)}`).join(" ");
  const hasData = data.some((d) => d.revenue > 0 || d.orders > 0);
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || data.length === 0) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    setHover(Math.min(data.length - 1, Math.max(0, Math.round(((px - L) / iw) * (data.length - 1)))));
  };
  const h = hover === null ? null : data[hover];

  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold font-rubik text-[#111111]">{title}</span>
        <span className="flex gap-3">
          <LegendDot color={CHART_COLORS.primary} label={labels.revenue} />
          <LegendDot color={CHART_COLORS.secondary} label={labels.orders} />
        </span>
      </figcaption>
      <div ref={ref} className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title}>
          {ticks(maxRev).map((t, i) => (
            <g key={i}>
              <line x1={L} x2={W - R} y1={yRev(t)} y2={yRev(t)} stroke={CHART_COLORS.grid} />
              <text x={L - 8} y={yRev(t) + 3} textAnchor="end" fontSize="10" fill={CHART_COLORS.axis}>{compact(t)}</text>
              <text x={W - R + 8} y={yRev(t) + 3} fontSize="10" fill={CHART_COLORS.axis}>{compact((maxOrd / 4) * i)}</text>
            </g>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={CHART_COLORS.axis}>{formatDay(d.date)}</text>
            ) : null
          )}
          {hasData && (
            <>
              <path d={`${path((d) => yRev(d.revenue))} L${x(data.length - 1)},${T + ih} L${x(0)},${T + ih} Z`} fill={CHART_COLORS.primary} opacity="0.07" />
              <path d={path((d) => yOrd(d.orders))} fill="none" stroke={CHART_COLORS.secondary} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              <path d={path((d) => yRev(d.revenue))} fill="none" stroke={CHART_COLORS.primary} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
          {hover !== null && h && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={T + ih} stroke={CHART_COLORS.axis} strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={yOrd(h.orders)} r="4" fill={CHART_COLORS.secondary} stroke="#fff" strokeWidth="2" />
              <circle cx={x(hover)} cy={yRev(h.revenue)} r="4" fill={CHART_COLORS.primary} stroke="#fff" strokeWidth="2" />
            </g>
          )}
          <rect x={L} y={T} width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
        {!hasData && <p className="absolute inset-0 flex items-center justify-center text-xs text-[#B7B7B7]">{empty}</p>}
        {hover !== null && h && (
          <Tooltip x={(x(hover) / W) * 100} y={8} width={150}>
            <div className="font-bold text-[#111111]">{formatDay(h.date)}</div>
            <div className="mt-1 flex items-center justify-between gap-3"><LegendDot color={CHART_COLORS.primary} label={labels.revenue} /><b>{formatMoney(h.revenue)}</b></div>
            <div className="flex items-center justify-between gap-3"><LegendDot color={CHART_COLORS.secondary} label={labels.orders} /><b>{h.orders}</b></div>
          </Tooltip>
        )}
      </div>
      <SrTable caption={title} head={[labels.date, labels.revenue, labels.orders]} rows={data.map((d) => [d.date, d.revenue, d.orders])} />
    </figure>
  );
}

// ---------------------------------------------------------------- stacked bars (shop growth)

export interface GrowthPoint {
  date: string;
  newShops: number;
  activeShops: number;
}

interface GrowthProps {
  data: GrowthPoint[];
  title: string;
  labels: { newShops: string; activeShops: string; date: string };
  formatDay: (iso: string) => string;
  empty: string;
}

export function ShopGrowthChart({ data, title, labels, formatDay, empty }: GrowthProps) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 420, H = 220, L = 32, R = 8, T = 10, B = 26;
  const iw = W - L - R, ih = H - T - B;
  const max = niceMax(Math.max(0, ...data.map((d) => d.newShops + d.activeShops)));
  const slot = iw / Math.max(1, data.length);
  const bw = Math.max(2, Math.min(14, slot - 2));
  const y = (v: number) => T + ih - (v / max) * ih;
  const hasData = data.some((d) => d.newShops + d.activeShops > 0);
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const h = hover === null ? null : data[hover];

  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold font-rubik text-[#111111]">{title}</span>
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title}>
          {ticks(max).map((t, i) => (
            <g key={i}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={CHART_COLORS.grid} />
              <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill={CHART_COLORS.axis}>{compact(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = L + slot * i + (slot - bw) / 2;
            const activeH = ih * (d.activeShops / max);
            const newH = ih * (d.newShops / max);
            return (
              <g key={d.date} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                <rect x={L + slot * i} y={T} width={slot} height={ih} fill="transparent" />
                {activeH > 0 && <rect x={cx} y={T + ih - activeH} width={bw} height={activeH} fill={CHART_COLORS.secondary} />}
                {newH > 0 && <rect x={cx} y={T + ih - activeH - newH - (activeH > 0 ? 2 : 0)} width={bw} height={newH} rx="2" fill={CHART_COLORS.primary} />}
                {i % labelEvery === 0 && (
                  <text x={cx + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill={CHART_COLORS.axis}>{formatDay(d.date)}</text>
                )}
              </g>
            );
          })}
        </svg>
        {!hasData && <p className="absolute inset-0 flex items-center justify-center text-xs text-[#B7B7B7]">{empty}</p>}
        {hover !== null && h && (
          <Tooltip x={((L + slot * hover + slot / 2) / W) * 100} y={4} width={140}>
            <div className="font-bold text-[#111111]">{formatDay(h.date)}</div>
            <div className="mt-1 flex items-center justify-between gap-3"><LegendDot color={CHART_COLORS.primary} label={labels.newShops} /><b>{h.newShops}</b></div>
            <div className="flex items-center justify-between gap-3"><LegendDot color={CHART_COLORS.secondary} label={labels.activeShops} /><b>{h.activeShops}</b></div>
          </Tooltip>
        )}
      </div>
      <div className="flex justify-center gap-4">
        <LegendDot color={CHART_COLORS.primary} label={labels.newShops} />
        <LegendDot color={CHART_COLORS.secondary} label={labels.activeShops} />
      </div>
      <SrTable caption={title} head={[labels.date, labels.newShops, labels.activeShops]} rows={data.map((d) => [d.date, d.newShops, d.activeShops])} />
    </figure>
  );
}

// ---------------------------------------------------------------- horizontal bars (revenue by category)

export function BarList({ items, title, formatValue, empty }: { items: { name: string; value: number; share: number }[]; title: string; formatValue: (n: number) => string; empty: string }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  const shades = [CHART_COLORS.primary, "#C0398F", CHART_COLORS.secondary, "#CBA3F0", CHART_COLORS.tertiary];
  return (
    <figure className="space-y-3">
      <figcaption className="text-sm font-bold font-rubik text-[#111111]">{title}</figcaption>
      {items.length === 0 || max === 0 ? (
        <p className="py-8 text-center text-xs text-[#B7B7B7]">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it, i) => (
            <li key={it.name} className="grid grid-cols-[minmax(0,110px)_1fr_auto] items-center gap-3 text-xs">
              <span className="truncate text-[#555555]" title={it.name}>{it.name}</span>
              <span className="h-3 rounded-full bg-[#F7F7F7]" aria-hidden="true">
                <span className="block h-full rounded-full" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: shades[i % shades.length] }} />
              </span>
              <span className="whitespace-nowrap font-bold text-[#111111]">
                {formatValue(it.value)} <span className="font-normal text-[#B7B7B7]">{it.share}%</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

// ---------------------------------------------------------------- donut (user distribution)

export function Donut({ segments, title, centerLabel, empty }: { segments: { name: string; value: number; share: number; color: string }[]; title: string; centerLabel: string; empty: string }) {
  const id = useId();
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <figure className="space-y-3">
      <figcaption className="text-sm font-bold font-rubik text-[#111111]">{title}</figcaption>
      {total === 0 ? (
        <p className="py-8 text-center text-xs text-[#B7B7B7]">{empty}</p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-labelledby={`${id}-t`}>
            <title id={`${id}-t`}>{title}</title>
            <g transform="rotate(-90 70 70)">
              {segments.map((s) => {
                const len = (s.value / total) * c;
                const el = (
                  <circle key={s.name} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="18" strokeDasharray={`${Math.max(0, len - 2)} ${c - Math.max(0, len - 2)}`} strokeDashoffset={-offset}>
                    <title>{`${s.name}: ${s.value} (${s.share}%)`}</title>
                  </circle>
                );
                offset += len;
                return el;
              })}
            </g>
            <text x="70" y="68" textAnchor="middle" fontSize="20" fontWeight="800" fill={CHART_COLORS.ink}>{total.toLocaleString()}</text>
            <text x="70" y="84" textAnchor="middle" fontSize="9" fill={CHART_COLORS.axis}>{centerLabel}</text>
          </svg>
          <ul className="space-y-2 text-xs">
            {segments.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-6">
                <LegendDot color={s.color} label={s.name} />
                <span className="font-bold text-[#111111]">{s.value.toLocaleString()} <span className="font-normal text-[#B7B7B7]">{s.share}%</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
