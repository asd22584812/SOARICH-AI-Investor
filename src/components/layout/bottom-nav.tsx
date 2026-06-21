"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, LineChart, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首頁", icon: Home },
  { href: "/analysis", label: "分析", icon: LineChart },
  { href: "/watchlist", label: "自選股", icon: Star },
  { href: "/portfolio", label: "持股", icon: BarChart3 },
  { href: "/profile", label: "我的", icon: User },
];

function NavLinks() {
  const pathname = usePathname();

  return (
    <>
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
              "bottom-nav-item",
              isActive ? "text-brand" : "text-text-secondary"
            )}
          >
            <Icon className="bottom-nav-icon" strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

/** Fixed to viewport — mobile真機 */
export function BottomNavViewport() {
  return (
    <nav className="bottom-nav bottom-nav--viewport" aria-label="主導航">
      <div className="bottom-nav__inner">
        <NavLinks />
      </div>
    </nav>
  );
}

/** Absolute inside phone frame — desktop模擬器 */
export function BottomNavFrame() {
  return (
    <nav className="bottom-nav bottom-nav--frame" aria-label="主導航">
      <div className="bottom-nav__inner">
        <NavLinks />
      </div>
    </nav>
  );
}
