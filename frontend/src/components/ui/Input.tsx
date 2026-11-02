import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleContext";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, id, type, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const { t } = useLocale();
    // Password fields get a show/hide toggle.
    const [visible, setVisible] = useState(false);
    const isPassword = type === "password";

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-ls-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {icon && <div className="absolute left-3.5 text-ls-muted">{icon}</div>}
          <input
            id={inputId}
            ref={ref}
            type={isPassword && visible ? "text" : type}
            aria-invalid={error ? true : undefined}
            className={cn(
              "w-full h-12 bg-[#EAEAEA] text-[#111111] text-[15px] px-4 rounded-lg font-normal transition-all placeholder:text-[#B7B7B7] focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent",
              icon ? "pl-11" : "",
              isPassword ? "pr-12" : "",
              error ? "border-[#ED4C5C] focus:ring-[#ED4C5C]" : "",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? t("authx.pw.hide") : t("authx.pw.show")}
              aria-pressed={visible}
              className="absolute right-1 w-11 h-11 flex items-center justify-center rounded-lg text-ls-muted hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-[#FA1EFF]"
            >
              {visible ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
          )}
        </div>
        {error && <span className="text-xs text-[#ED4C5C] font-medium mt-0.5">{error}</span>}
        {helperText && !error && <span className="text-xs text-ls-muted mt-0.5">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
