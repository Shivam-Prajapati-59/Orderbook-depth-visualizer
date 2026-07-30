import type { NormalizedOrderBook, VenueConnectionState, VenueId } from '@/src/adapters/base/types';

export type DepthPaneStatus = 'loading' | 'error' | 'ready';

/** Single venue: error if WS failed; ready once we have a normalized book snapshot. */
export function getDepthPaneStatus(
    book: NormalizedOrderBook | undefined,
    connection: VenueConnectionState | undefined,
): DepthPaneStatus {
    if (connection?.status === 'error') return 'error';
    if (book) return 'ready';
    return 'loading';
}

export function selectedVenuesAllErrored(
    venues: VenueId[],
    connections: Partial<Record<VenueId, VenueConnectionState>>,
): boolean {
    if (venues.length === 0) return false;
    return venues.every((v) => connections[v]?.status === 'error');
}

export function selectedVenuesAnyLoading(
    venues: VenueId[],
    books: Partial<Record<VenueId, NormalizedOrderBook>>,
    connections: Partial<Record<VenueId, VenueConnectionState>>,
): boolean {
    return venues.some((v) => getDepthPaneStatus(books[v], connections[v]) === 'loading');
}

export function venuesInError(
    venues: VenueId[],
    connections: Partial<Record<VenueId, VenueConnectionState>>,
): VenueId[] {
    return venues.filter((v) => connections[v]?.status === 'error');
}