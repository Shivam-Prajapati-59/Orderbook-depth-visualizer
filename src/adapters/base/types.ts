export type VenueId = 'hyperliquid' | 'lighter';

export interface VenueMetaData {
  id: VenueId;
  label: string;
  tickSize: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  venue: VenueId;
}

export interface DepthLevel extends OrderBookLevel {
  notional: number; // price * size
  cumulative: number; // running sum
}

export interface NormalizedOrderBook {
  venue: VenueId;
  asset: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdatedAt: number;
}

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'closed';

export interface VenueConnectionState {
  venue: VenueId;
  status: ConnectionStatus;
  errorMessage?: string;
  reconnectAttempts: number;
}

export type OrderBookUpdateType = 'snapshot' | 'delta';

export interface AdapterConfig {
  venue: VenueId;
  symbol: string;
  tickSize?: number;
}

export type OrderbookUpdateCallback = (orderbook: NormalizedOrderBook) => void;

export type ConnectionStatusCallback = (state: VenueConnectionState) => void;

export type SymbolMap = Record<string, string>;