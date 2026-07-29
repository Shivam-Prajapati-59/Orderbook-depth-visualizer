export function formatCompactUsd(n: number): string {
    if (!Number.isFinite(n) || n <= 0) return '—';
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
    return `$${Math.round(n).toLocaleString('en-US')}`;
}

function niceStep(n: number): number {
    if (!Number.isFinite(n) || n <= 0) return 1;
    const exp = Math.floor(Math.log10(n));
    const f = n / 10 ** exp;
    const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * 10 ** exp;
}


export function buildSizeAxisTicks(maxValue: number): number[] {
    if (!Number.isFinite(maxValue) || maxValue <= 0) return [0];
    const step = niceStep(maxValue / 4);
    const ticks: number[] = [];
    for (let v = 0; v <= maxValue + 1e-9; v += step) {
        ticks.push(Math.round(v));
    }
    const roundedMax = Math.ceil(maxValue / step) * step;
    if (ticks[ticks.length - 1]! < roundedMax - 1e-9) {
        ticks.push(roundedMax);
    }
    return [...new Set(ticks)].sort((a, b) => a - b);
}