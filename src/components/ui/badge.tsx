import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "gold" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variant === "default" && "bg-white/10 text-white/80",
        variant === "gold" &&
          "bg-gold-500/20 text-gold-300 border border-gold-500/30",
        variant === "outline" && "border border-white/20 text-white/70",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
