import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-bold text-[#111111]">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {icon && <div className="absolute left-3.5 text-[#B7B7B7]">{icon}</div>}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full h-12 bg-[#EAEAEA] text-[#111111] text-base px-4 rounded-xl font-normal transition-all placeholder:text-[#B7B7B7] focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent",
              icon ? "pl-11" : "",
              error ? "border-[#ED4C5C] focus:ring-[#ED4C5C]" : "",
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-[#ED4C5C] font-medium mt-0.5">{error}</span>}
        {helperText && !error && <span className="text-xs text-[#B7B7B7] mt-0.5">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
