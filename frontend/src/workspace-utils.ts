import type { RoundItem } from "./types";

export function roundLabel(round: RoundItem) {
  return round.cueTime
    ? `Round ${round.roundNumber} • ${round.cueTime}`
    : `Round ${round.roundNumber}`;
}

export function sourceRoundLabel(round: RoundItem) {
  if (!round.sourceRoundNumbers?.length) {
    return `来源轮次 ${round.roundNumber}`;
  }

  return `来源轮次 ${round.sourceRoundNumbers.join(", ")}`;
}
