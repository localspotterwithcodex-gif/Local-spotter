import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    // Defaulting to type="button" prevents a Button used for a non-submit
    // action (upload trigger, GPS lookup, "+" controls, etc.) inside a
    // <form> from silently submitting/reloading the page — the root cause
    // of the crash described in PROMPT.md item 7. Pages that want a submit
    // button must pass type="submit" explicitly (the signup/login/
    // onboarding forms already do).
    const baseStyles =
      "inline-flex items-center justify-center font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FA1EFF] disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variantStyles = {
      primary: "bg-[#FA1EFF] text-white hover:bg-[#E000EC] active:scale-[0.98]",
      secondary: "bg-[#FAE2F0] text-[#FA1EFF] hover:bg-[#F5CEE6] active:scale-[0.98]",
      outline: "border-2 border-[#FA1EFF] text-[#FA1EFF] bg-transparent hover:bg-[#FAE2F0]/50",
      ghost: "text-[#111111] hover:bg-[#EAEAEA]/60",
      danger: "bg-[#ED4C5C] text-white hover:bg-[#D93B4B]",
    };

    const sizeStyles = {
      sm: "h-9 px-3 text-xs rounded-md",
      md: "h-12 px-6 text-sm rounded-lg",
      lg: "h-14 px-8 text-base rounded-xl",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? "w-full" : "",
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
