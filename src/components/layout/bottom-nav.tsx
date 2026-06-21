"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, LineChart, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首頁", icon: Home },
  { href: "/analysis", label: "分析", icon: LineChart },
  { href: "/watchlist", label: "自選股", icon: Star },
  { href: "/portfolio", label: "投資組合", icon: BarChart3 },
  { href: "/profile", label: "我的", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav__inner">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5",
                isActive ? "text-brand" : "text-text-secondary"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
