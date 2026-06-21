import { BottomNav } from "./bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="viewport-root">
      <div className="phone-frame">
        <div className="phone-frame__island" aria-hidden />
        <div className="phone-frame__screen">
          <main className="app-content app-bg">{children}</main>
          <BottomNav />
        </div>
        <div className="phone-frame__home-bar" aria-hidden />
      </div>
    </div>
  );
}
