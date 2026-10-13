"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SwitchOption<T extends string = string> {
  id: T;
  label: string;
}

interface SegmentedSwitchProps<T extends string = string> {
  options: SwitchOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

export function SegmentedSwitch<T extends string = string>({
  options,
  activeId,
  onChange,
  className,
}: SegmentedSwitchProps<T>) {
  return (
    <div
      className={cn(
        "w-full max-w-[394px] h-[58px] bg-[#F4F5FA] p-1.5 rounded-2xl flex items-center justify-between select-none shadow-xs mx-auto",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = activeId === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex-1 h-full rounded-xl text-sm font-bold transition-all flex items-center justify-center px-2",
              isActive
                ? "bg-[#FCE1F0] text-[#0A182E] shadow-xs border border-[#F4D0E2] scale-[1.02]"
                : "text-[#8A95A5] hover:text-[#0A182E]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
