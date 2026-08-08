'use client';

import { CandlestickChartPanel } from './CandlestickChartPanel';

export function ChartColumn() {
    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r-0 bg-[#0B0E11] panel:border-r panel:border-[#1E2329] xl:h-full">
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0B0E11]">
                <CandlestickChartPanel />
            </div>
        </div>
    );
}
