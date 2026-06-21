import { BottomNavFrame, BottomNavViewport } from "./bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="viewport-root app-root">
      <div className="phone-frame phone-border">
        <div className="dynamic-island" aria-hidden />
        <div className="phone-frame__screen">
          <main className="app-content app-bg">{children}</main>
          <BottomNavFrame />
        </div>
        <div className="phone-frame__home-bar" aria-hidden />
      </div>
      <BottomNavViewport />
    </div>
  );
}
