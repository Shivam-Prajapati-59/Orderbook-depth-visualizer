export const MID_STRIP_H = 34;
export const ROW_FR = 'minmax(0,1fr)';
export const Y_AXIS_W = '3.25rem';

export const ROW_EDGE = 'shadow-[inset_0_-1px_0_0_rgb(31_41_55_/_0.55)]';

/** Fraction digits so labels match a price grid step (e.g. 0.001 → 3, 0.1 → 1, 1 → 0). */
export function priceFractionDigitsForTick(tick: number): number {
    if (!Number.isFinite(tick) || tick <= 0) return 2;
    if (tick >= 1) return 0;
    let n = 0;
    let t = tick;
    while (t < 1 - 1e-12 && n < 18) {
        t *= 10;
        n += 1;
    }
    return n;
}

export function fmtPriceAtTick(p: number, tick: number): string {
    return fmtPriceWithDigits(p, priceFractionDigitsForTick(tick));
}

export function fmtPriceWithDigits(p: number, fractionDigits: number): string {
    const fd = Math.max(0, Math.min(18, Math.floor(fractionDigits)));
    return p.toLocaleString('en-US', {
        minimumFractionDigits: fd,
        maximumFractionDigits: fd,
    });
}