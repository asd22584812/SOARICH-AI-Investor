import { BottomNav } from "./bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mobile-app">
      <main className="mobile-content">{children}</main>
      <BottomNav />
    </div>
  );
}
