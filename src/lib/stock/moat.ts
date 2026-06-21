import type { MoatScore, StockInput } from "./types";

export function calculateMoatScore(stock: Pick<
  StockInput,
  | "brandPower"
  | "technologyBarrier"
  | "scaleEconomy"
  | "switchingCost"
  | "networkEffect"
>): MoatScore {
  const {
    brandPower,
    technologyBarrier,
    scaleEconomy,
    switchingCost,
    networkEffect,
  } = stock;

  const moatScore = Math.round(
    (brandPower +
      technologyBarrier +
      scaleEconomy +
      switchingCost +
      networkEffect) /
      5
  );

  return {
    brandPower,
    technologyBarrier,
    scaleEconomy,
    switchingCost,
    networkEffect,
    moatScore,
  };
}
