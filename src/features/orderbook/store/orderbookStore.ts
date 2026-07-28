import { NormalizedOrderBook, VenueConnectionState, VenueId } from '@/src/adapters/base/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Shape of the persisted orderbook state — one book + connection per venue
interface OrderBookState {
    books: Partial<Record<VenueId, NormalizedOrderBook>>;
    connections: Partial<Record<VenueId, VenueConnectionState>>;
    venueOrderbookTicks: Partial<Record<VenueId, number>>;
}

// Actions exposed on the store for consumers to mutate state
interface OrderBookActions {
    setBook: (book: NormalizedOrderBook) => void;
    setConnection: (connection: VenueConnectionState) => void;
    setVenueOrderbookTick: (venue: VenueId, tick: number | null) => void;
    clearAllVenueTicks: () => void;
    clearVenueBook: (venue: VenueId) => void;
    clearVenue: (venue: VenueId) => void;
    reset: () => void;
}

// Default empty state used as the initial value and by reset()
const initialState: OrderBookState = {
    books: {},
    connections: {},
    venueOrderbookTicks: {},
};

export const useOrderbookStore = create<OrderBookState & OrderBookActions>()(
    // Wrap with devtools middleware to log actions in the browser extension
    devtools(
        (set) => ({
            ...initialState,

            // Replace the full book for a single venue
            setBook: (book) =>
                set(
                    (state) => ({ books: { ...state.books, [book.venue]: book } }),
                    false,
                    'orderbook/setBook',
                ),

            // Update the connection state for a single venue
            setConnection: (connection) =>
                set(
                    (state) => ({ connections: { ...state.connections, [connection.venue]: connection } }),
                    false,
                    'orderbook/setConnection',
                ),

            // Store or clear the tick size for a venue (null/<=0 removes the entry)
            setVenueOrderbookTick: (venue, tick) =>
                set(
                    (state) => {
                        const venueOrderbookTicks = { ...state.venueOrderbookTicks };
                        if (tick == null || !Number.isFinite(tick) || tick <= 0) {
                            delete venueOrderbookTicks[venue];
                        } else {
                            venueOrderbookTicks[venue] = tick;
                        }
                        return { venueOrderbookTicks };
                    },
                    false,
                    'orderbook/setVenueOrderbookTick',
                ),

            // Remove all stored tick sizes (used when the display asset changes)
            clearAllVenueTicks: () =>
                set({ venueOrderbookTicks: {} }, false, 'orderbook/clearAllVenueTicks'),

            // Remove only the book for a single venue (keeps connection + tick)
            clearVenueBook: (venueId) =>
                set(
                    (state) => {
                        const books = { ...state.books };
                        delete books[venueId];
                        return { books };
                    },
                    false,
                    'orderbook/clearVenueBook',
                ),

            // Remove every trace of a venue (book, connection, tick)
            clearVenue: (venueId) =>
                set(
                    (state) => {
                        const books = { ...state.books };
                        const connections = { ...state.connections };
                        const venueOrderbookTicks = { ...state.venueOrderbookTicks };
                        delete books[venueId];
                        delete connections[venueId];
                        delete venueOrderbookTicks[venueId];

                        return { books, connections, venueOrderbookTicks };
                    },
                    false,
                    'orderbook/clearVenue',
                ),

            // Wipe the entire store back to initial state
            reset: () => set(() => ({ ...initialState }), false, 'orderbook/reset'),
        }),
        { name: 'OrderbookStore' },
    ),
);

// Selector factory: retrieve the book for a specific venue
export const selectBook = (venueId: VenueId) => (state: OrderBookState) => state.books[venueId];

// Selector factory: retrieve all books (used by the aggregation pipeline)
export const selectAllBooks = () => (state: OrderBookState) => state.books;

// Selector factory: retrieve the tick-size map for all venues
export const selectVenueOrderBookTicks = () => (state: OrderBookState) => state.venueOrderbookTicks;

// Selector factory: retrieve the connection state for a specific venue
export const selectConnection = (venueId: VenueId) => (state: OrderBookState) =>
    state.connections[venueId];

// Selector factory: check whether a specific venue is connected
export const selectIsConnected = (venueId: VenueId) => (state: OrderBookState) =>
    state.connections[venueId]?.status === 'connected';

// Direct selector: return all non-null books as a flat array
export const selectBooksArray = (state: OrderBookState) =>
    Object.values(state.books).filter(Boolean);