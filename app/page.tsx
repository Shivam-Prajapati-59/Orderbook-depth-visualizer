import TradingHeader from "@/src/components/trading/TradingHeader";
import Orderbook from "@/src/components/trading/Orderbook";
import { ChartColumn } from "@/src/features/ohlcv/components/ChartColumn";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0B0E11] text-gray-200">
      <TradingHeader />

      <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 xl:overflow-hidden">
        <div className="mx-auto min-h-0 xl:h-full">
          <div className="flex flex-col gap-4 xl:h-full xl:min-h-0 xl:flex-row xl:items-stretch">
            {/* Chart (OHLCV) — wider column */}
            <section className="flex min-h-[480px] w-full min-w-0 flex-col overflow-hidden rounded border border-[#1E2329] bg-[#141920] shadow-xl xl:min-h-0 xl:flex-[3]">
              <ChartColumn />
            </section>

            {/* Orderbook — narrower column */}
            <section className="flex min-h-[480px] w-full min-w-0 flex-col xl:min-h-0 xl:flex-[2]">
              <Orderbook />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
