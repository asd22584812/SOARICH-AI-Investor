import { BottomNav } from "./bottom-nav";
import { MarketFilterProvider } from "@/contexts/market-filter-context";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <MarketFilterProvider>
      <div className="mobile-app">
        <main className="mobile-content">{children}</main>
        <BottomNav />
      </div>
    </MarketFilterProvider>
  );
}
