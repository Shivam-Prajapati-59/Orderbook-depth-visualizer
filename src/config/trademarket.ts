import { SymbolMap } from "../adapters/base/types";

export const TRADE_MARKETS = [
  {
    id: 'ETH',
    name: 'Ethereum',
    hlCoin: 'ETH',
    lighterMarketIndex: 0,
    pacificaSymbol: 'ETH',
    asterSymbol: 'ETHUSDT',
    iconUrl: 'https://assets.coincap.io/assets/icons/eth@2x.png',
  },
  {
    id: 'BTC',
    name: 'Bitcoin',
    hlCoin: 'BTC',
    lighterMarketIndex: 1,
    pacificaSymbol: 'BTC',
    asterSymbol: 'BTCUSDT',
    iconUrl: 'https://assets.coincap.io/assets/icons/btc@2x.png',
  },
  {
    id: 'SOL',
    name: 'Solana',
    hlCoin: 'SOL',
    lighterMarketIndex: 2,
    pacificaSymbol: 'SOL',
    asterSymbol: 'SOLUSDT',
    iconUrl: 'https://assets.coincap.io/assets/icons/sol@2x.png',
  },
  {
    id: 'HYPE',
    name: 'Hyperliquid',
    hlCoin: 'HYPE',
    lighterMarketIndex: 24,
    pacificaSymbol: 'HYPE',
    asterSymbol: 'HYPEUSDT',
    iconUrl: 'https://assets.coingecko.com/coins/images/50882/small/hyperliquid.jpg',
  },
  {
    id: 'XRP',
    name: 'XRP',
    hlCoin: 'XRP',
    lighterMarketIndex: 7,
    pacificaSymbol: 'XRP',
    asterSymbol: 'XRPUSDT',
    iconUrl: 'https://assets.coincap.io/assets/icons/xrp@2x.png',
  },
  {
    id: 'AAVE',
    name: 'Aave',
    hlCoin: 'AAVE',
    lighterMarketIndex: 27,
    pacificaSymbol: 'AAVE',
    asterSymbol: 'AAVEUSDT',
    iconUrl: 'https://assets.coincap.io/assets/icons/aave@2x.png',
  },
] as const;

export type TradeMarket = (typeof TRADE_MARKETS)[number];

export type TradableAsset = TradeMarket['id'];


export function getTradeMarket(id: string): TradeMarket | undefined {
  return TRADE_MARKETS.find((market) => market.id === id);
}
export function getTradeMarketIds(ids: string[]): TradeMarket[] {
  return ids.map((id) => getTradeMarket(id)).filter((market) => market !== undefined) as TradeMarket[];
}
export const HYPERLIQUID_SYMBOL_MAP: SymbolMap = Object.fromEntries(
  TRADE_MARKETS.map((m) => [m.id, m.hlCoin]),
);

export const LIGHTER_SYMBOL_MAP: SymbolMap = Object.fromEntries(
  TRADE_MARKETS.map((m) => [m.id, m.id]),
);
export const LIGHTER_MARKET_INDEX: Record<string, number> = Object.fromEntries(
  TRADE_MARKETS.map((m) => [m.id, m.lighterMarketIndex]),
);
export const PACIFICA_SYMBOL_MAP: SymbolMap = Object.fromEntries(
  TRADE_MARKETS.map((m) => [m.id, m.pacificaSymbol]),
);
export const ASTER_SYMBOL_MAP: SymbolMap = Object.fromEntries(
  TRADE_MARKETS.map((m) => [m.id, m.asterSymbol]),
);

export const AGGREGATED_DEPTH_DISPLAY_TICK: Partial<Record<TradableAsset, number>> = {
  ETH: 0.1,
  BTC: 1,
  AAVE: 0.001,
  HYPE: 0.001,
  XRP: 0.0001,
  SOL: 0.001,
};

/**
 * Fraction digits for depth Y-axis, mid, spread, and tooltips (assignment tuning).
 */
export const DEPTH_AXIS_PRICE_DECIMALS: Partial<Record<TradableAsset, number>> = {
  ETH: 2,
  BTC: 2,
  AAVE: 3,
  HYPE: 3,
  XRP: 4,
  SOL: 3,
};

export function getTradableMarket(id: string): TradeMarket | undefined {
  return TRADE_MARKETS.find((m) => m.id === id);
}

export function isTradableAsset(value: string): value is TradableAsset {
  return TRADE_MARKETS.some((m) => m.id === value);
}

export function aggregatedDepthDisplayTick(asset: string): number | undefined {
  if (!isTradableAsset(asset)) return undefined;
  return AGGREGATED_DEPTH_DISPLAY_TICK[asset];
}

export function depthAxisFractionDigits(asset: string, fallbackFractionDigits: number): number {
  if (!isTradableAsset(asset)) {
    return clampFractionDigits(fallbackFractionDigits);
  }
  const mapped = DEPTH_AXIS_PRICE_DECIMALS[asset];
  if (mapped !== undefined) return clampFractionDigits(mapped);
  return clampFractionDigits(fallbackFractionDigits);
}

function clampFractionDigits(n: number): number {
  if (!Number.isFinite(n)) return 2;
  return Math.max(0, Math.min(18, Math.floor(n)));
}

export function perpDisplayLabel(asset: TradableAsset): string {
  return `${asset}-USD-PERP`;
}