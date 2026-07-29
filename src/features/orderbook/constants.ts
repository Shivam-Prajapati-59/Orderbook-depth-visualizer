import type { VenueId } from '@/src/adapters/base/types';
import { VENUE_DISPLAY } from '@/src/config/venueDisplay';
export type { VenueId };

export { VENUE_DISPLAY };
export type { VenueDisplayMeta } from '@/src/config/venueDisplay';

// Venue string constants for use across the orderbook feature
export const VENUE = {
  HYPERLIQUID: 'hyperliquid',
  LIGHTER: 'lighter',
  PACIFICA: 'pacifica',
  ASTER: 'aster',
} as const satisfies Record<string, VenueId>;

// Human-readable labels pulled from the shared venue display config
export const VENUE_LABELS: Record<VenueId, string> = {
  hyperliquid: VENUE_DISPLAY.hyperliquid.name,
  lighter: VENUE_DISPLAY.lighter.name,
  pacifica: VENUE_DISPLAY.pacifica.name,
  aster: VENUE_DISPLAY.aster.name,
};

// Bid/ask hex colours used for depth-chart rendering per venue
// Each pair uses a cool/warm contrast — bid is the cooler tone, ask is the warmer tone
export const VENUE_PALETTE: Record<VenueId, { bid: string; ask: string }> = {
  hyperliquid: { bid: '#4ade80', ask: '#fb7185' },
  lighter:     { bid: '#2dd4bf', ask: '#fb923c' },
  pacifica:    { bid: '#818cf8', ask: '#e879f9' },
  aster:       { bid: '#67e8f9', ask: '#f472b6' },
};

// Venue colour metadata combining palette swatches with Tailwind utility-class names
export const VENUE_COLORS = {
  hyperliquid: {
    swatch: VENUE_PALETTE.hyperliquid.bid,
    bidBar: 'bg-venue-hl-bid',
    askBar: 'bg-venue-hl-ask',
  },
  lighter: {
    swatch: VENUE_PALETTE.lighter.bid,
    bidBar: 'bg-venue-lt-bid',
    askBar: 'bg-venue-lt-ask',
  },
  pacifica: {
    swatch: VENUE_PALETTE.pacifica.bid,
    bidBar: 'bg-venue-pc-bid',
    askBar: 'bg-venue-pc-ask',
  },
  aster: {
    swatch: VENUE_PALETTE.aster.bid,
    bidBar: 'bg-venue-at-bid',
    askBar: 'bg-venue-at-ask',
  },
} as const;

// Hex colour lookup used by the depth-bar rendering logic
export const VENUE_DEPTH_HEX: Record<VenueId, { bid: string; ask: string }> = {
  hyperliquid: VENUE_PALETTE.hyperliquid,
  lighter: VENUE_PALETTE.lighter,
  pacifica: VENUE_PALETTE.pacifica,
  aster: VENUE_PALETTE.aster,
};

// Short handle (e.g. "HL", "LT") for compact venue labels
export function venueShortLabel(id: VenueId): string {
  return VENUE_DISPLAY[id].shortName;
}