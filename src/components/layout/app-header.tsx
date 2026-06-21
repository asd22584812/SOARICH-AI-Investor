import Image from "next/image";

export function AppHeader() {
  return (
    <header className="app-header">
      <Image
        src="/logo.png"
        alt="SOARICH Investor"
        width={40}
        height={40}
        className="app-logo"
        priority
      />
      <span className="app-header__title">SOARICH Investor</span>
    </header>
  );
}
