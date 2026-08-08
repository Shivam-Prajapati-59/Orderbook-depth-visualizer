"use client";

import { DepthChart } from "@/src/features/orderbook/components/DepthChart";
import { DepthControls } from "@/src/features/orderbook/components/DepthControls";
import { VenueLegend } from "@/src/features/orderbook/components/VenueLegend";

export default function Orderbook() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded border border-[#1E2329] bg-[#0B0E11] shadow-xl xl:h-full">
      <DepthControls />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <DepthChart />
      </div>
      <VenueLegend />
    </div>
  );
}
