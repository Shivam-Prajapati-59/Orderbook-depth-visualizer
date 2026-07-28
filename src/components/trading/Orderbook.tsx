"use client";

import { useEffect, useState, useMemo } from "react";
import { HyperliquidAdapter } from "@/src/adapters/hyperliquid/orderbook/client";
import { LighterAdapter } from "@/src/adapters/lighter/orderbook/client";
import { PacificaAdapter } from "@/src/adapters/pacifica/orderbook/client";
import { AsterAdapter } from "@/src/adapters/aster/orderbook/client";
import { NormalizedOrderBook, VenueConnectionState, OrderBookLevel } from "@/src/adapters/base/types";
import { useMarketStore } from "@/src/store/marketStore";

const MAX_LEVELS = 20;

function OrderbookColumn({
  venue,
  book,
  status,
}: {
  venue: string;
  book: NormalizedOrderBook | null;
  status: string;
}) {
  const maxBidSize = useMemo(() => Math.max(...(book?.bids.slice(0, MAX_LEVELS).map(b => b.size) || [0])), [book]);
  const maxAskSize = useMemo(() => Math.max(...(book?.asks.slice(0, MAX_LEVELS).map(a => a.size) || [0])), [book]);

  return (
    <div className="flex flex-col flex-1 border-r border-[#1E2329] last:border-r-0 bg-[#0B0E11] font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-[#1E2329] bg-[#141920]">
        <span className="font-semibold text-gray-300 capitalize">{venue}</span>
        <span className={`text-[10px] uppercase font-bold tracking-wider ${status === 'connected' ? 'text-green-500' : status === 'error' ? 'text-red-500' : 'text-yellow-500'}`}>
          {status}
        </span>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden p-1">
        {/* Asks (Top half) */}
        <div className="flex flex-col-reverse flex-1 overflow-hidden min-h-[200px]">
          {book ? book.asks.slice(0, MAX_LEVELS).map((ask, i) => (
            <div key={i} className="relative flex justify-between px-2 py-0.5 group hover:bg-[#1E2329]/50">
              <div
                className="absolute inset-y-0 right-0 bg-[#ef4444]/10 transition-all"
                style={{ width: `${Math.min((ask.size / maxAskSize) * 100, 100)}%` }}
              />
              <span className="text-[#ef4444] z-10">{ask.price.toFixed(2)}</span>
              <span className="text-gray-300 z-10">{ask.size.toFixed(4)}</span>
            </div>
          )) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 animate-pulse">Waiting for Asks...</div>
          )}
        </div>

        {/* Spread Indicator */}
        <div className="flex items-center justify-center py-2 my-1 border-y border-[#1E2329]/50 bg-[#141920]/50">
          {book && book.bids.length > 0 && book.asks.length > 0 ? (
            <div className="flex items-center gap-4 text-sm font-semibold text-gray-200">
              <span>Spread</span>
              <span className="text-gray-400">
                {(book.asks[0].price - book.bids[0].price).toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-gray-600">---</span>
          )}
        </div>

        {/* Bids (Bottom half) */}
        <div className="flex flex-col flex-1 overflow-hidden min-h-[200px]">
          {book ? book.bids.slice(0, MAX_LEVELS).map((bid, i) => (
            <div key={i} className="relative flex justify-between px-2 py-0.5 group hover:bg-[#1E2329]/50">
              <div
                className="absolute inset-y-0 right-0 bg-[#22c55e]/10 transition-all"
                style={{ width: `${Math.min((bid.size / maxBidSize) * 100, 100)}%` }}
              />
              <span className="text-[#22c55e] z-10">{bid.price.toFixed(2)}</span>
              <span className="text-gray-300 z-10">{bid.size.toFixed(4)}</span>
            </div>
          )) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 animate-pulse">Waiting for Bids...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Orderbook() {
  const selectedMarketId = useMarketStore((state) => state.selectedMarketId);

  const [hlStatus, setHlStatus] = useState<string>("idle");
  const [hlBook, setHlBook] = useState<NormalizedOrderBook | null>(null);

  const [lighterStatus, setLighterStatus] = useState<string>("idle");
  const [lighterBook, setLighterBook] = useState<NormalizedOrderBook | null>(null);

  const [pacificaStatus, setPacificaStatus] = useState<string>("idle");
  const [pacificaBook, setPacificaBook] = useState<NormalizedOrderBook | null>(null);

  const [asterStatus, setAsterStatus] = useState<string>("idle");
  const [asterBook, setAsterBook] = useState<NormalizedOrderBook | null>(null);

  useEffect(() => {
    // 1. Instantiate adapters
    const hlAdapter = new HyperliquidAdapter();
    const lighterAdapter = new LighterAdapter();
    const pacificaAdapter = new PacificaAdapter();
    const asterAdapter = new AsterAdapter();

    // 2. Connect Hyperliquid
    hlAdapter.connect(
      (newBook) => setHlBook(newBook),
      (newStatus: VenueConnectionState) => setHlStatus(newStatus.status)
    );

    // 3. Connect Lighter
    lighterAdapter.connect(
      (newBook) => setLighterBook(newBook),
      (newStatus: VenueConnectionState) => setLighterStatus(newStatus.status)
    );

    // 4. Connect Pacifica
    pacificaAdapter.connect(
      (newBook) => setPacificaBook(newBook),
      (newStatus: VenueConnectionState) => setPacificaStatus(newStatus.status)
    );

    // 5. Connect Aster
    asterAdapter.connect(
      (newBook) => setAsterBook(newBook),
      (newStatus: VenueConnectionState) => setAsterStatus(newStatus.status)
    );

    // 6. Subscribe to the selected asset
    hlAdapter.subscribe(selectedMarketId);
    lighterAdapter.subscribe(selectedMarketId);
    pacificaAdapter.subscribe(selectedMarketId);
    asterAdapter.subscribe(selectedMarketId);

    // 7. Cleanup on unmount or market change
    return () => {
      hlAdapter.unsubscribe();
      hlAdapter.disconnect();
      lighterAdapter.unsubscribe();
      lighterAdapter.disconnect();
      pacificaAdapter.unsubscribe();
      pacificaAdapter.disconnect();
      asterAdapter.unsubscribe();
      asterAdapter.disconnect();
      setHlBook(null);
      setLighterBook(null);
      setPacificaBook(null);
      setAsterBook(null);
    };
  }, [selectedMarketId]);

  return (
    <div className="flex w-full h-[600px] border border-[#1E2329] bg-[#0B0E11] rounded shadow-xl overflow-hidden">
      <OrderbookColumn venue="Hyperliquid" book={hlBook} status={hlStatus} />
      <OrderbookColumn venue="Lighter" book={lighterBook} status={lighterStatus} />
      <OrderbookColumn venue="Pacifica" book={pacificaBook} status={pacificaStatus} />
      <OrderbookColumn venue="Aster" book={asterBook} status={asterStatus} />
    </div>
  );
}
