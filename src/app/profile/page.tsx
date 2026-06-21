import {
  Bell,
  Bot,
  ChevronRight,
  Database,
  Info,
  SlidersHorizontal,
} from "lucide-react";

const menuItems = [
  { icon: Bell, label: "通知設定" },
  { icon: Database, label: "資料來源設定" },
  { icon: Bot, label: "AI 分析設定" },
  { icon: SlidersHorizontal, label: "風險偏好設定" },
  { icon: Info, label: "關於" },
];

export default function ProfilePage() {
  return (
    <div className="space-y-6 page-safe-top">
      <header>
        <h1 className="text-lg font-semibold text-text-primary">我的</h1>
        <p className="mt-1 text-sm text-text-secondary">個人設定</p>
      </header>

      <div className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className="card-glass flex w-full items-center justify-between rounded-2xl p-4 transition-colors active:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-brand" strokeWidth={1.8} />
                <span className="text-sm text-text-primary">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-secondary/40" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
