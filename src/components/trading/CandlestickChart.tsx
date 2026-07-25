"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries } from "lightweight-charts";

import { useMarketStore } from "@/src/features/store/marketStore";
import { useOhlcvSettingsStore, VenueId } from "@/src/features/store/ohlcvSettingsStore";
import { TRADE_MARKETS, HYPERLIQUID_SYMBOL_MAP, LIGHTER_MARKET_INDEX } from "@/src/config/trademarket";

import { fetchHyperliquidCandleHistory } from "@/src/adapters/hyperliquid/ohlcv/candleSnapshot";
import { HyperliquidCandlesClient } from "@/src/adapters/hyperliquid/ohlcv/candleClient";
import { fetchCandles } from "@/src/adapters/lighter/ohlcv/fetchCandles";
import type { OhlcvBar } from "@/src/adapters/hyperliquid/ohlcv/types"; // Both use same structure
import { fetchPacificaCandleHistory } from "@/src/adapters/pacifica/ohlcv/candleSnapshot";
import { PacificaCandlesClient } from "@/src/adapters/pacifica/ohlcv/candleClient";
import { PACIFICA_SYMBOL_MAP } from "@/src/config/trademarket";

const TIMEFRAME_TO_MS: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
};

export default function CandlestickChart() {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    const [isLoading, setIsLoading] = useState(true);

    const selectedMarketId = useMarketStore((state) => state.selectedMarketId);
    const timeframe = useOhlcvSettingsStore((state) => state.timeframe);
    const candleVenue = useOhlcvSettingsStore((state) => state.candleVenue);

    const selectedMarket = TRADE_MARKETS.find((m) => m.id === selectedMarketId) || TRADE_MARKETS[0];

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // 1. Initialize Chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#9CA3AF",
            },
            grid: {
                vertLines: { color: "#1F2937" },
                horzLines: { color: "#1F2937" },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400, // Fixed height for now, adjust based on layout needs
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: "#22c55e",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#22c55e",
            wickDownColor: "#ef4444",
        });

        chartRef.current = chart;
        seriesRef.current = series;

        // Resize handler
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, []);

    // 2. Load Data when dependencies change
    useEffect(() => {
        let isMounted = true;
        const abortController = new AbortController();
        let hlClient: HyperliquidCandlesClient | null = null;
        let pacificaClient: PacificaCandlesClient | null = null;

        const loadData = async () => {
            if (!seriesRef.current) return;
            setIsLoading(true);

            const endTime = Date.now();
            const maxBars = 1000;
            const msPerCandle = TIMEFRAME_TO_MS[timeframe] || 60000;
            const startTime = endTime - maxBars * msPerCandle;

            try {
                let bars: OhlcvBar[] = [];

                if (candleVenue === 'hyperliquid') {
                    const hlCoin = HYPERLIQUID_SYMBOL_MAP[selectedMarketId] || selectedMarketId;

                    // Fetch historical snapshot
                    bars = await fetchHyperliquidCandleHistory({
                        coin: hlCoin,
                        interval: timeframe,
                        startTimeMs: startTime,
                        endTimeMs: endTime,
                        signal: abortController.signal,
                    });

                    // Set up realtime updates
                    hlClient = new HyperliquidCandlesClient(HYPERLIQUID_SYMBOL_MAP);
                    hlClient.connect(
                        (realtimeBars) => {
                            if (!isMounted || !seriesRef.current) return;
                            // Update last candle or append new
                            for (const bar of realtimeBars) {
                                seriesRef.current.update(bar as CandlestickData);
                            }
                        },
                        (status) => {
                            console.log('[HL Candle WS]', status);
                        }
                    );
                    hlClient.subscribe(selectedMarketId, timeframe);

                } else if (candleVenue === 'lighter') {
                    const marketIdx = LIGHTER_MARKET_INDEX[selectedMarketId];
                    if (marketIdx !== undefined) {
                        bars = await fetchCandles({
                            marketId: marketIdx,
                            resolution: timeframe,
                            rangeStartMs: startTime,
                            rangeEndMs: endTime,
                            maxBars,
                            signal: abortController.signal,
                        });
                    }
                } else if (candleVenue === 'pacifica') {
                    const pacificaCoin = PACIFICA_SYMBOL_MAP[selectedMarketId] || selectedMarketId;

                    // Fetch historical snapshot
                    bars = await fetchPacificaCandleHistory({
                        symbol: pacificaCoin,
                        interval: timeframe,
                        start_time: startTime,
                        end_time: endTime,
                        signal: abortController.signal,
                    });

                    // Set up realtime updates
                    pacificaClient = new PacificaCandlesClient(PACIFICA_SYMBOL_MAP);
                    pacificaClient.connect(
                        (realtimeBars) => {
                            if (!isMounted || !seriesRef.current) return;
                            for (const bar of realtimeBars) {
                                seriesRef.current.update(bar as CandlestickData);
                            }
                        },
                        (status) => {
                            console.log('[Pacifica Candle WS]', status);
                        }
                    );
                    pacificaClient.subscribe(selectedMarketId, timeframe);
                }

                if (isMounted && seriesRef.current) {
                    // Filter out invalid bars just in case and map to strict format
                    const formattedBars = bars.map(b => ({
                        time: b.time,
                        open: b.open,
                        high: b.high,
                        low: b.low,
                        close: b.close,
                    })).filter(b => b.time && !isNaN(b.open) && !isNaN(b.close) && !isNaN(b.high) && !isNaN(b.low));

                    // Lightweight charts requires strictly ascending unique times. 
                    // To be absolutely safe, let's deduplicate and sort:
                    const uniqueBars = Array.from(new Map(formattedBars.map(item => [item.time, item])).values());
                    uniqueBars.sort((a, b) => a.time - b.time);

                    seriesRef.current.setData(uniqueBars as CandlestickData[]);
                }
            } catch (error) {
                if (error instanceof Error && error.name !== 'AbortError') {
                    console.error('Failed to load chart data:', error);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadData();

        return () => {
            isMounted = false;
            abortController.abort();
            if (hlClient) {
                hlClient.destroy();
            }
            if (pacificaClient) {
                pacificaClient.destroy();
            }
        };
    }, [selectedMarketId, timeframe, candleVenue]);

    return (
        <div className="relative w-full h-[400px] border-b border-[#1E2329] bg-[#0B0E11]">
            {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0B0E11]/80 backdrop-blur-sm">
                    <div className="text-sm font-mono text-gray-400 animate-pulse">Loading Chart Data...</div>
                </div>
            )}
            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
}
