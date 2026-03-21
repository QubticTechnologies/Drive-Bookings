import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        {label && <label className="text-sm font-medium text-foreground/80 ml-1">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full bg-input/50 border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground transition-all duration-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-input",
              icon && "pl-11",
              error && "border-destructive focus:border-destructive focus:ring-destructive",
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-destructive ml-1">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
