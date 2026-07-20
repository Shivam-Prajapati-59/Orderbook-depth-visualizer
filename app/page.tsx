import TradingHeader from "@/src/components/trading/TradingHeader";
import OhlcvChartToolbar from "@/src/features/ohlcv/OhlcvChartToolbar";

export default function Home() {
  return (
    <div className="">
      <TradingHeader />
      <OhlcvChartToolbar />
    </div>
  );
}
