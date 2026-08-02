import { logPipelineError } from "@/src/lib/pipelineError";
import type { OhlcvBar } from "../types";

export function mergeOhlcvBarsByOpenTime(
  existing: OhlcvBar[],
  incoming: OhlcvBar[],
): OhlcvBar[] {
  try {
    const byOpenTime = new Map<number, OhlcvBar>();
    for (const bar of existing) {
      byOpenTime.set(bar.time, bar);
    }
    for (const bar of incoming) {
      byOpenTime.set(bar.time, bar);
    }
    return [...byOpenTime.values()].sort(
      (left, right) => left.time - right.time,
    );
  } catch (error) {
    logPipelineError("mergeOhlcvBarsByOpenTime", error);
    return existing;
  }
}
