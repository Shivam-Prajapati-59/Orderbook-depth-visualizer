"use client";

import { useEffect, useState } from "react";
import { HyperliquidAdapter } from "@/src/adapters/hyperliquid/orderbook/client";
import { NormalizedOrderBook, VenueConnectionState } from "@/src/adapters/base/types";

export default function OrderbookTest() {
  const [status, setStatus] = useState<string>("idle");
  const [book, setBook] = useState<NormalizedOrderBook | null>(null);

  useEffect(() => {
    // 1. Instantiate the adapter
    const adapter = new HyperliquidAdapter();

    // 2. Connect and provide callbacks
    adapter.connect(
      (newBook) => {
        setBook(newBook);
        // Console log heavily throttled to avoid freezing browser, but you will see it in dev tools
      },
      (newStatus: VenueConnectionState) => {
        setStatus(newStatus.status);
        console.log("[Test Component] Status Update:", newStatus);
      }
    );

    // 3. Subscribe to an asset defined in trademarket.ts
    adapter.subscribe("ETH");

    // 4. Cleanup on unmount
    return () => {
      adapter.unsubscribe();
      adapter.disconnect();
    };
  }, []);

  return (
    <div className="p-4 border border-zinc-800 m-4 rounded bg-zinc-950 text-white font-mono">
      <h2 className="text-xl font-bold mb-4 text-zinc-100">Hyperliquid Connection Test (ETH)</h2>
      <div className="mb-4">
        <span className="text-zinc-400">Connection Status: </span>
        <span className={`font-bold ${status === 'connected' ? 'text-green-500' : 'text-yellow-500'}`}>
          {status.toUpperCase()}
        </span>
      </div>

      {book ? (
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <h3 className="text-green-400 border-b border-zinc-800 pb-1 mb-2 font-bold">Bids (Top 10)</h3>
            <div className="flex flex-col gap-1">
              {book.bids.slice(0, 10).map((bid, i) => (
                <div key={i} className="flex justify-between">
                  <span>{bid.price.toFixed(1)}</span>
                  <span className="text-zinc-500">{bid.size.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-red-400 border-b border-zinc-800 pb-1 mb-2 font-bold">Asks (Top 10)</h3>
            <div className="flex flex-col gap-1">
              {book.asks.slice(0, 10).map((ask, i) => (
                <div key={i} className="flex justify-between">
                  <span>{ask.price.toFixed(1)}</span>
                  <span className="text-zinc-500">{ask.size.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-zinc-500 animate-pulse">Waiting for tick data...</p>
      )}
    </div>
  );
}
