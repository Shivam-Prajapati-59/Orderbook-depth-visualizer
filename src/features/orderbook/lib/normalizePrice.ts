const MAX_INV = 1e15;

export async function normalizePrice(price: number, tick: number) {
    try {

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

export function normalizePriceForSide(price: number, tick: number, side: 'bid' | 'ask'): number {
    try {
        if (!Number.isFinite(price) || !Number.isFinite(tick) || tick <= 0) {
            return price;
        }

        const inv = 1 / tick;
        if (!Number.isFinite(inv) || inv > MAX_INV) {
            return price;
        }

        const n = side === 'bid' ? Math.floor(price * inv) : Math.ceil(price * inv);
        return n / inv;
    } catch {
        return price;
    }
}