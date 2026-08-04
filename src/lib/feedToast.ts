import { toast } from "sonner";

/** Stable Sonner ids so the same feed does not spam duplicate toasts. */
export const feedToastId = {
  orderbook: (venue: string) => `feed:orderbook:${venue}`,
  hlCandlesHistory: (asset: string, tf: string) =>
    `feed:hl-history:${asset}:${tf}`,
  hlCandlesWs: (asset: string, tf: string) => `feed:hl-ws:${asset}:${tf}`,
  lighterCandles: (asset: string, tf: string) => `feed:lighter:${asset}:${tf}`,
  asterCandles: (asset: string, tf: string) => `feed:aster:${asset}:${tf}`,
  pacificCandles: (asset: string, tf: string) => `feed:pacific:${asset}:${tf}`,
} as const;

function truncate(s: string, max = 180): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export function toastFeedError(
  id: string,
  title: string,
  description?: string,
): void {
  toast.error(title, {
    id,
    description: description ? truncate(description) : undefined,
    duration: 5_000,
  });
}

export function toastFeedWarning(
  id: string,
  title: string,
  description?: string,
): void {
  toast.warning(title, {
    id,
    description: description ? truncate(description) : undefined,
    duration: 4_000,
  });
}

export function dismissFeedToast(id: string): void {
  toast.dismiss(id);
}

export function formatUnknownError(err: unknown): string {
  if (err instanceof Error) return err.message || "Unknown error";
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err) ?? "Unknown error";
  } catch {
    return "Unknown error";
  }
}
