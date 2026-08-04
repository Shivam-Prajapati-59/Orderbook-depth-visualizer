import TradingHeader from "@/src/components/trading/TradingHeader";
import Orderbook from "@/src/components/trading/Orderbook";
import { ChartColumn } from "@/src/features/ohlcv/components/ChartColumn";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0B0E11] text-gray-200">
      <TradingHeader />
      
      <main className="flex-1 p-4">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Top section: Chart */}
          <section className="flex h-[480px] flex-col bg-[#141920] border border-[#1E2329] rounded shadow-xl overflow-hidden">
            <ChartColumn />
          </section>

          {/* Bottom section: Orderbook */}
          <section>
            <h2 className="text-xl font-bold font-mono mb-4 text-gray-300">Orderbook Comparison</h2>
            <Orderbook />
          </section>
        </div>
      </main>
    </div>
  );
}
