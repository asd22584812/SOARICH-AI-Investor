"use client";

import Image from "next/image";

interface SplashScreenProps {
  exiting?: boolean;
  reducedMotion?: boolean;
}

export function SplashScreen({ exiting = false, reducedMotion = false }: SplashScreenProps) {
  return (
    <div
      className={`splash-screen${exiting ? " splash-screen--exit" : ""}${
        reducedMotion ? " splash-screen--reduced" : ""
      }`}
      aria-hidden={exiting}
      role="presentation"
    >
      <div className="splash-screen__grid" aria-hidden />

      <div className="splash-screen__content">
        <Image
          src="/logo.png"
          alt="SOARICH Investor"
          width={118}
          height={118}
          className="splash-logo"
          priority
        />

        <h1 className="splash-title">SOARICH Investor</h1>
        <p className="splash-subtitle">Professional Investment Intelligence</p>

        <div className="splash-loading" aria-hidden>
          <div className="splash-loading-bar" />
        </div>
      </div>
    </div>
  );
}
