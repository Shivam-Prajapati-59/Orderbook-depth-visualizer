import { VenueAdapter } from '@/src/adapters/base/adapter.interface';
import { useOrderbookStore } from '../store/orderbookStore';
import { useEffect, useMemo, useRef } from 'react';
import { NormalizedOrderBook, VenueId } from '@/src/adapters/base/types';
import { HyperliquidAdapter } from '@/src/adapters/hyperliquid/orderbook/client';
import { LighterAdapter } from '@/src/adapters/lighter/orderbook/client';
import { PacificaAdapter } from '@/src/adapters/pacifica/orderbook/client';
import { AsterAdapter } from '@/src/adapters/aster/orderbook/client';
import { throttle } from 'lodash-es';

// Map venue keys to their adapter constructors (stable, closed-over at module scope)
const ADAPTER_FACTORIES: Record<VenueId, () => VenueAdapter> = {
    hyperliquid: () => new HyperliquidAdapter(),
    lighter: () => new LighterAdapter(),
    pacifica: () => new PacificaAdapter(),
    aster: () => new AsterAdapter(),
};

interface UseOrderbookStreamProps {
    asset: string;
    venues: VenueId[];
}

// Write-only stream controller: subscribes/unsubscribes WebSocket adapters as venues change.
// Uses getState() instead of hook-subscription to avoid re-renders on every WS tick.
export const useOrderBookStream = ({
    asset,
    venues,
}: UseOrderbookStreamProps) => {
    // Grab stable action references once — they never change between renders
    const {
        setConnection,
        clearVenue,
        setVenueOrderbookTick,
    } = useOrderbookStore.getState();

    // Stable refs (never trigger re-render) holding active adapters and previous props
    const adaptersRef = useRef<Partial<Record<VenueId, VenueAdapter>>>({});
    const prevAssetRef = useRef<string | null>(null);
    const prevVenuesRef = useRef<VenueId[]>([]);

    // Keep latest venues available through a ref so the effect body can read them
    // without adding the raw array to the dependency list
    const venuesRef = useRef<VenueId[]>(venues);
    venuesRef.current = venues;

    // Derive a stable, order-independent key from the venues array so the effect
    // only reruns when the actual set of venues changes, not on reference identity
    const venuesKey = useMemo(
        () => [...venues].sort().join(','),
        [venues],
    );

    // Per-venue throttle map so each venue's WS updates are throttled independently.
    // Avoids one venue's trailing update being swallowed by another venue's call.
    const throttleMapRef = useRef<Partial<Record<VenueId, ReturnType<typeof throttle>>>>({});

    useEffect(() => {
        const activeAdapters = adaptersRef.current;
        const currentVenues = venuesRef.current;
        const targetSet = new Set(currentVenues);

        // Compare against previous values to decide whether we can keep an existing subscription
        const assetChanged = prevAssetRef.current !== asset;
        const previousVenues = prevVenuesRef.current;
        const previousVenueSet = new Set(previousVenues);

        // Fetch the tick size from the adapter and persist it in the store
        const refreshTick = (adapter: VenueAdapter, venue: VenueId) => {
            adapter.getOrderbookTickSize(asset)
                .then((t) => setVenueOrderbookTick(venue, t))
                .catch((error) => {
                    console.error(`[useOrderBookStream] Failed to fetch tick size for ${venue}`, error);
                });
        };
        // 1. Disconnect from venues that are no longer selected to prevent memory leaks
        const liveVenues = Object.keys(activeAdapters) as VenueId[];
        for (const venue of liveVenues) {
            if (!targetSet.has(venue)) {
                activeAdapters[venue]?.disconnect();
                delete activeAdapters[venue];
                // Cancel and remove the per-venue throttle
                throttleMapRef.current[venue]?.cancel();
                delete throttleMapRef.current[venue];
                clearVenue(venue);
            }
        }

        // Helper: lazily create or retrieve the per-venue throttle function
        const getThrottledSetBook = (venue: VenueId) => {
            if (!throttleMapRef.current[venue]) {
                throttleMapRef.current[venue] = throttle((book: NormalizedOrderBook) => {
                    useOrderbookStore.getState().setBook(book);
                }, 100);
            }
            return throttleMapRef.current[venue]!;
        };

        // 2. Connect to venues that are now selected
        for (const venue of targetSet) {
            if (activeAdapters[venue]) {
                // Keep the existing connection if both asset and venue haven't changed;
                // skip the redundant refreshTick — the tick hasn't gone stale
                if (!assetChanged && previousVenueSet.has(venue)) {
                    continue;
                }

                // Asset changed — re-subscribe on the existing connection
                try {
                    activeAdapters[venue]!.unsubscribe();
                    activeAdapters[venue]!.subscribe(asset);
                    refreshTick(activeAdapters[venue]!, venue);
                } catch (error) {
                    console.error(`[useOrderBookStream] Failed to re-subscribe ${venue}`, error);
                }
                continue;
            }

            const factory = ADAPTER_FACTORIES[venue];
            if (!factory) {
                console.error(`[useOrderBookStream] No adapter factory found for ${venue}`);
                continue;
            }

            let adapter: VenueAdapter;
            try {
                adapter = factory();
            } catch (error) {
                console.error(`[useOrderBookStream] Failed to instantiate adapter for ${venue}`, error);
                continue;
            }

            // Wrap connect + subscribe in try/catch so one venue failure
            // doesn't abort the loop or skip the prevRef updates below
            try {
                const venueThrottle = getThrottledSetBook(venue);
                adapter.connect(
                    (book) => venueThrottle(book),
                    (connectionState) => setConnection(connectionState),
                );
                adapter.subscribe(asset);
                refreshTick(adapter, venue);
                activeAdapters[venue] = adapter;
            } catch (error) {
                console.error(`[useOrderBookStream] Failed to connect/subscribe ${venue}`, error);
                // Clean up the half-initialized adapter
                try { adapter.destroy(); } catch { /* best-effort */ }
            }
        }

        // Stash current props for the next effect run
        prevAssetRef.current = asset;
        prevVenuesRef.current = [...currentVenues];
        // Depend on venuesKey (stable string) instead of raw venues array.
        // Store actions are grabbed once via getState() — no need to depend on them.
    }, [asset, venuesKey, setConnection, clearVenue, setVenueOrderbookTick]);

    // Cleanup on unmount: cancel all per-venue throttles and destroy all adapters
    useEffect(() => {
        return () => {
            // Cancel every per-venue throttle
            for (const fn of Object.values(throttleMapRef.current)) {
                fn?.cancel();
            }
            throttleMapRef.current = {};

            const activeAdapters = adaptersRef.current;
            for (const venue of Object.keys(activeAdapters) as VenueId[]) {
                activeAdapters[venue]?.destroy();
                clearVenue(venue);
            }

            adaptersRef.current = {};
        };
    }, [clearVenue]);
};
