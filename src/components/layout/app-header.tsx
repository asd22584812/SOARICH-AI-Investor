import Image from "next/image";

export function AppHeader() {
  return (
    <header className="header">
      <Image
        src="/logo.png"
        alt="SOARICH Investor"
        width={42}
        height={42}
        className="logo"
        priority
      />
      <span className="title">SOARICH Investor</span>
    </header>
  );
}
