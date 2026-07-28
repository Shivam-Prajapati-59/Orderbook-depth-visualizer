import { VENUE_DISPLAY } from '@/src/features/orderbook/constants';
import { VenueId } from '@/src/features/ohlcv/types';
import { cn } from '@/src/lib/utils';

type VenueLogoSize = 'xs' | 'sm' | 'md';

const sizeClass: Record<VenueLogoSize, string> = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-5',
};

interface VenueLogoProps {
  venueId: VenueId;
  size?: VenueLogoSize;
  className?: string;
}

export function VenueLogo({ venueId, size = 'sm', className }: VenueLogoProps) {
  const meta = VENUE_DISPLAY[venueId];
  if (!meta) return null;

  return (
    <img
      src={meta.logoUrl}
      alt={meta.name}
      className={cn('shrink-0 rounded-full object-cover', sizeClass[size], className)}
    />
  );
}
