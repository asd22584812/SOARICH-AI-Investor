"use client";

import { useEffect, useState } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { cn } from "@/lib/utils";

interface SplashGateProps {
  children: React.ReactNode;
}

type SplashPhase = "splash" | "exiting" | "done";

export function SplashGate({ children }: SplashGateProps) {
  const [phase, setPhase] = useState<SplashPhase>("splash");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const prefersReduced = media.matches;
    setReducedMotion(prefersReduced);

    const exitDelay = prefersReduced ? 320 : 1800;
    const doneDelay = prefersReduced ? 520 : 2200;

    document.documentElement.classList.add("splash-active");

    const exitTimer = window.setTimeout(() => {
      setPhase("exiting");
    }, exitDelay);

    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      document.documentElement.classList.remove("splash-active");
    }, doneDelay);

    const onMotionChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    media.addEventListener("change", onMotionChange);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
      media.removeEventListener("change", onMotionChange);
      document.documentElement.classList.remove("splash-active");
    };
  }, []);

  if (phase === "done") {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className={cn(
          "splash-app-content",
          phase === "exiting" && "splash-app-content--visible"
        )}
        aria-hidden={phase === "splash"}
      >
        {children}
      </div>
      <SplashScreen exiting={phase === "exiting"} reducedMotion={reducedMotion} />
    </>
  );
}
