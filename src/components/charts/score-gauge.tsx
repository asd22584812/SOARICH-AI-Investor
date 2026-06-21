"use client";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: number;
}

export function ScoreGauge({ score, label, size = 160 }: ScoreGaugeProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  const scoreColor =
    score >= 80 ? "#22C55E" : score >= 60 ? "#C8A85D" : score >= 40 ? "#EAB308" : "#EF4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-semibold tracking-tight text-text-primary">
            {score}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-brand">{label}</p>
    </div>
  );
}
