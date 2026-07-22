import TradingHeader from "@/src/components/trading/TradingHeader";
import OhlcvChartToolbar from "@/src/features/ohlcv/OhlcvChartToolbar";
import OrderbookTest from "@/src/components/trading/OrderbookTest";

export default function Home() {
  return (
    <div className="">
      <TradingHeader />
      <OhlcvChartToolbar />
      <OrderbookTest />
    </div>
  );
}
