"use client";

import { useMemo } from "react";
import { useMarketStore } from "@/src/store/marketStore";
import { useOrderbookStore } from "@/src/features/orderbook/store/orderbookStore";
import { useDepthSettingsStore } from "@/src/features/orderbook/store/depthSettingStore";
import { useOrderBookStream } from "@/src/features/orderbook/hooks/useOrderBookStream";
import { aggregateDepth } from "@/src/features/orderbook/aggregation/aggregator";
import { DepthControls } from "@/src/features/orderbook/components/DepthControls";
import { DepthChartPanel } from "@/src/features/orderbook/components/DepthChartPanel";
import { priceFractionDigitsForTick } from "@/src/features/orderbook/lib/depthChartLayout";
import { VENUE_LABELS, type VenueId } from "@/src/features/orderbook/constants";
import type { NormalizedOrderBook } from "@/src/adapters/base/types";

const MAX_LEVELS = 20;

function OrderbookColumn({
  venue,
  book,
  status,
}: {
  venue: VenueId;
  book: NormalizedOrderBook | null;
  status: string;
}) {
  const maxBidSize = useMemo(
    () => Math.max(...(book?.bids.slice(0, MAX_LEVELS).map((b) => b.size) || [0])),
    [book],
  );
  const maxAskSize = useMemo(
    () => Math.max(...(book?.asks.slice(0, MAX_LEVELS).map((a) => a.size) || [0])),
    [book],
  );

  return (
    <div className="flex flex-1 flex-col border-r border-[#1E2329] bg-[#0B0E11] font-mono text-xs last:border-r-0">
      <div className="flex items-center justify-between border-b border-[#1E2329] bg-[#141920] p-2">
        <span className="font-semibold text-gray-300 capitalize">{VENUE_LABELS[venue]}</span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${status === "connected"
              ? "text-green-500"
              : status === "error"
                ? "text-red-500"
                : "text-yellow-500"
            }`}
        >
          {status}
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden p-1">
        <div className="flex flex-1 flex-col-reverse overflow-hidden min-h-[200px]">
          {book
            ? book.asks.slice(0, MAX_LEVELS).map((ask, i) => (
              <div
                key={i}
                className="group relative flex justify-between px-2 py-0.5 hover:bg-[#1E2329]/50"
              >
                <div
                  className="absolute inset-y-0 right-0 bg-[#fb7185]/10 transition-all"
                  style={{ width: `${Math.min((ask.size / maxAskSize) * 100, 100)}%` }}
                />
                <span className="z-10 text-[#fb7185]">{ask.price.toFixed(2)}</span>
                <span className="z-10 text-gray-300">{ask.size.toFixed(4)}</span>
              </div>
            ))
            : <div className="flex items-center justify-center flex-1 text-[10px] text-gray-600">Loading asks…</div>}
        </div>

        <div className="my-1 flex items-center justify-center border-y border-[#1E2329]/50 bg-[#141920]/50 py-2">
          {book && book.bids.length > 0 && book.asks.length > 0 ? (
            <span className="text-sm font-semibold text-gray-200">
              Spread {(book.asks[0].price - book.bids[0].price).toFixed(2)}
            </span>
          ) : (
            <span className="text-gray-600">---</span>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden min-h-[200px]">
          {book
            ? book.bids.slice(0, MAX_LEVELS).map((bid, i) => (
              <div
                key={i}
                className="group relative flex justify-between px-2 py-0.5 hover:bg-[#1E2329]/50"
              >
                <div
                  className="absolute inset-y-0 right-0 bg-[#4ade80]/10 transition-all"
                  style={{ width: `${Math.min((bid.size / maxBidSize) * 100, 100)}%` }}
                />
                <span className="z-10 text-[#4ade80]">{bid.price.toFixed(2)}</span>
                <span className="z-10 text-gray-300">{bid.size.toFixed(4)}</span>
              </div>
            ))
            : <div className="flex items-center justify-center flex-1 text-[10px] text-gray-600">Loading bids…</div>}
        </div>
      </div>
    </div>
  );
}

export default function Orderbook() {
  const selectedMarketId = useMarketStore((s) => s.selectedMarketId);
  const displayMode = useDepthSettingsStore((s) => s.displayMode);
  const selectedVenues = useDepthSettingsStore((s) => s.selectedVenues);
  const depthLevels = useDepthSettingsStore((s) => s.depthLevels);

  useOrderBookStream({ asset: selectedMarketId, venues: selectedVenues });

  const books = useOrderbookStore((s) => s.books);
  const connections = useOrderbookStore((s) => s.connections);
  const venueTicks = useOrderbookStore((s) => s.venueOrderbookTicks);

  const filteredBooks = useMemo(
    () =>
      Object.fromEntries(
        selectedVenues
          .map((venue) => [venue, books[venue]])
          .filter(([, book]) => book != null),
      ) as typeof books,
    [books, selectedVenues],
  );

  const aggregatedDepth = useMemo(
    () =>
      aggregateDepth(filteredBooks, selectedMarketId, depthLevels, venueTicks, {
        displayTickFloor: 0,
      }),
    [filteredBooks, selectedMarketId, depthLevels, venueTicks],
  );

  const priceFractionDigits = useMemo(
    () => priceFractionDigitsForTick(aggregatedDepth.displayTickSize),
    [aggregatedDepth.displayTickSize],
  );

  if (displayMode === "split") {
    return (
      <div className="flex w-full min-h-[600px] flex-col border border-[#1E2329] bg-[#0B0E11] rounded shadow-xl overflow-hidden">
        <DepthControls />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {selectedVenues.map((venue) => (
            <OrderbookColumn
              key={venue}
              venue={venue}
              book={books[venue] ?? null}
              status={connections[venue]?.status ?? "idle"}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-[600px] flex-col border border-[#1E2329] bg-[#0B0E11] rounded shadow-xl overflow-hidden">
      <DepthControls />
      <DepthChartPanel
        bidLevels={aggregatedDepth.bids}
        askLevels={aggregatedDepth.asks}
        maxCumulativeSize={aggregatedDepth.maxCumulativeSize}
        maxCumulativeDollar={aggregatedDepth.maxCumulativeDollar}
        baseSymbol={selectedMarketId}
        venues={selectedVenues}
        midPriceLabel={
          aggregatedDepth.midPrice != null
            ? aggregatedDepth.midPrice.toLocaleString("en-US", {
              minimumFractionDigits: priceFractionDigits,
              maximumFractionDigits: priceFractionDigits,
            })
            : "---"
        }
        midPrice={aggregatedDepth.midPrice ?? 0}
        spreadAbs={aggregatedDepth.spread ?? 0}
        priceFractionDigits={priceFractionDigits}
        showYAxis={false}
      />
    </div>
  );
}
