import type { KeyPersonRisk } from "@/types/stock";
import { RISK_LEVEL_CONFIG } from "@/lib/constants";
import { User, Users, GitBranch, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyPersonSectionProps {
  risk: KeyPersonRisk;
}

const RISK_ITEMS = [
  { key: "ceo" as const, label: "CEO", icon: User },
  { key: "founder" as const, label: "創辦人", icon: Shield },
  { key: "succession" as const, label: "接班制度", icon: GitBranch },
  { key: "teamMaturity" as const, label: "管理團隊", icon: Users },
];

export function KeyPersonSection({ risk }: KeyPersonSectionProps) {
  const config = RISK_LEVEL_CONFIG[risk.level];

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">關鍵人物風險</h2>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
            config.bg,
            config.color
          )}
        >
          <span>{config.icon}</span>
          <span>風險 {config.label}</span>
        </div>
      </div>

      <div className="space-y-3">
        {RISK_ITEMS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="flex gap-3 rounded-xl bg-bg-card-secondary p-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-card">
              <Icon className="h-4 w-4 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-brand">{label}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
                {risk[key]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
