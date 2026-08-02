import {
  getTradableMarket,
  type TradableAsset,
} from "@/src/config/trademarket";

export {
  CANDLES_HTTP_PATH as LIGHTER_CANDLES_HTTP_PATH,
  REST_API_ORIGIN as LIGHTER_REST_BASE_URL,
} from "@/src/adapters/lighter/constants";

// Hyperliquid `candle` / `l2Book` subscription **`coin`** (perp coin symbol).

export function hyperliquidCoinForAsset(asset: TradableAsset): string | null {
  return getTradableMarket(asset)?.hlCoin ?? null;
}

// Lighter candles endpoint **`market_id`** (integer market index from order book details).

export function lighterMarketIdForAsset(asset: TradableAsset): number | null {
  const m = getTradableMarket(asset);
  if (!m) return null;
  return m.lighterMarketIndex;
}
