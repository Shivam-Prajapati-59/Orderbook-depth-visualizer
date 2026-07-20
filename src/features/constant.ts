import { VenueId } from "./ohlcv/types";

export const VENUE = {
    HYPERLIQUID: 'hyperliquid',
    LIGHTER: 'lighter',
} as const satisfies Record<string, VenueId>;

export const VENUE_LABELS: Record<VenueId, string> = {
    hyperliquid: 'Hyperliquid',
    lighter: 'Lighter',
};

export type VenueDisplayMeta = {
  id: VenueId;
  name: string;
  shortName: string;
  logoUrl: string;
  depthMenuHint?: string;
  websiteUrl?: string;
};

export const VENUE_DISPLAY: Record<VenueId, VenueDisplayMeta> = {
  hyperliquid: {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    shortName: 'HL',
    logoUrl: 'https://assets.coingecko.com/coins/images/50882/standard/hyperliquid.jpg?1729431300',
    depthMenuHint: 'Bid · ask',
    websiteUrl: 'https://hyperliquid.xyz',
  },
  lighter: {
    id: 'lighter',
    name: 'Lighter',
    shortName: 'LT',
    logoUrl: 'https://assets.coingecko.com/coins/images/71121/standard/lighter.png?1765888098',
    depthMenuHint: 'Bid · ask',
    websiteUrl: 'https://lighter.xyz',
  },
};

export function getVenueDisplay(id: VenueId): VenueDisplayMeta {
  return VENUE_DISPLAY[id];
}