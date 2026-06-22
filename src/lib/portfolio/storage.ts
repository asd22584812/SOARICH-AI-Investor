import type { PortfolioLedger, PortfolioPosition } from "@/types/stock";

const STORAGE_KEY = "soarich-portfolio-v1";

const EMPTY_LEDGER: PortfolioLedger = { positions: [] };

function isValidPosition(value: unknown): value is PortfolioPosition {
  if (!value || typeof value !== "object") return false;
  const position = value as PortfolioPosition;
  return (
    typeof position.id === "string" &&
    typeof position.symbol === "string" &&
    typeof position.shares === "number" &&
    position.shares > 0 &&
    typeof position.avgCost === "number" &&
    position.avgCost > 0
  );
}

export function loadPortfolio(): PortfolioLedger {
  if (typeof window === "undefined") return EMPTY_LEDGER;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_LEDGER;

    const parsed = JSON.parse(raw) as PortfolioLedger;
    const positions = (parsed.positions ?? []).filter(isValidPosition);
    return { positions };
  } catch {
    return EMPTY_LEDGER;
  }
}

export function savePortfolio(positions: PortfolioPosition[]): void {
  if (typeof window === "undefined") return;

  const ledger: PortfolioLedger = { positions };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
}

export function createPositionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
