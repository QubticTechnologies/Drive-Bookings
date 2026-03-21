import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "neutral";
}

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary/10 text-primary border border-primary/20",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    error: "bg-destructive/10 text-destructive border border-destructive/20",
    neutral: "bg-secondary text-secondary-foreground border border-white/5",
  };

  return (
    <span
      className={cn(
        "px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
