"use client";

import { cn } from "@/lib/utils";

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentControlProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);

  return (
    <div
      className={cn(
        "relative flex rounded-xl bg-bg-card-secondary p-1",
        className
      )}
    >
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-bg-card shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{
          width: `calc(${100 / options.length}% - 4px)`,
          left: `calc(${(activeIndex * 100) / options.length}% + 2px)`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.4), inset 0 0 0 0.5px rgba(255,255,255,0.06)",
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-colors duration-200",
            value === option.value ? "text-text-primary" : "text-text-secondary"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
