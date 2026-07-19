export const TRADE_MARKETS = [
  {
    id: 'ETH',
    name: 'Ethereum',
    hlCoin: 'ETH',
    lighterMarketIndex: 0,
    iconUrl: 'https://assets.coincap.io/assets/icons/eth@2x.png',
  },
  {
    id: 'BTC',
    name: 'Bitcoin',
    hlCoin: 'BTC',
    lighterMarketIndex: 1,
    iconUrl: 'https://assets.coincap.io/assets/icons/btc@2x.png',
  },
  {
    id: 'SOL',
    name: 'Solana',
    hlCoin: 'SOL',
    lighterMarketIndex: 2,
    iconUrl: 'https://assets.coincap.io/assets/icons/sol@2x.png',
  },
  {
    id: 'HYPE',
    name: 'Hyperliquid',
    hlCoin: 'HYPE',
    lighterMarketIndex: 24,
    iconUrl: 'https://assets.coingecko.com/coins/images/50882/small/hyperliquid.jpg',
  },
  {
    id: 'XRP',
    name: 'XRP',
    hlCoin: 'XRP',
    lighterMarketIndex: 7,
    iconUrl: 'https://assets.coincap.io/assets/icons/xrp@2x.png',
  },
  {
    id: 'AAVE',
    name: 'Aave',
    hlCoin: 'AAVE',
    lighterMarketIndex: 27,
    iconUrl: 'https://assets.coincap.io/assets/icons/aave@2x.png',
  },
] as const;

export type TradeMarket = (typeof TRADE_MARKETS)[number];

export function getTradeMarket(id: string) :TradeMarket | undefined {
  return TRADE_MARKETS.find((market) => market.id === id);
}
export function getTradeMarketIds(ids: string[]): TradeMarket[] {
  return ids.map((id) => getTradeMarket(id)).filter((market) => market !== undefined) as TradeMarket[];
}
