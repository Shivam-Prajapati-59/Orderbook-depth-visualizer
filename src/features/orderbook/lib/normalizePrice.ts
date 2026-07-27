// Guard against unreasonably large 1/tick inverses (overflow prevention)
const MAX_INV = 1e15;

// Round a price to the nearest tick boundary (unused, kept for symmetry with normalizePriceForSide)
export function normalizePrice(price: number, tick: number) {
    try {
        // Skip invalid inputs — return price unchanged
        if (!Number.isFinite(price) || !Number.isFinite(tick) || tick <= 0) {
            return price;
        }

        const inv = 1 / tick;
        if (!Number.isFinite(inv) || inv > MAX_INV) {
            return price;
        }

        const n = Math.round(price * inv);
        return n / inv;
    } catch (error) {
        console.error("Error normalizing price", error);
        return price;
    }
}

// Snap a price to the nearest tick, biased toward the book-side (floor for bids, ceil for asks)
export function normalizePriceForSide(price: number, tick: number, side: 'bid' | 'ask'): number {
    try {
        // Skip invalid inputs — return price unchanged
        if (!Number.isFinite(price) || !Number.isFinite(tick) || tick <= 0) {
            return price;
        }

        const inv = 1 / tick;
        if (!Number.isFinite(inv) || inv > MAX_INV) {
            return price;
        }

        // Bid → floor (aggressive rounding down), Ask → ceil (aggressive rounding up)
        const n = side === 'bid' ? Math.floor(price * inv) : Math.ceil(price * inv);
        return n / inv;
    } catch {
        return price;
    }
}