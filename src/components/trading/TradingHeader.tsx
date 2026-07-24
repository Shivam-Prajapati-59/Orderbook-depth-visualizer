"use client";

import React from "react";
import { ChevronDown } from 'lucide-react';
import Image from "next/image";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { TRADE_MARKETS } from '@/src/config/trademarket';
import { useMarketStore } from '@/src/features/store/marketStore';

const TradingHeader = () => {
  const selectedMarketId = useMarketStore((state) => state.selectedMarketId);
  const setSelectedMarketId = useMarketStore((state) => state.setSelectedMarketId);

  const selectedMarket = TRADE_MARKETS.find(m => m.id === selectedMarketId) || TRADE_MARKETS[0];

  return (
    <header className="flex h-16 w-full items-center border-b border-[#1E2329] bg-[#0B0E11] px-4 sm:gap-8 text-white">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-4 border border-[#1F2937] p-2 rounded-md hover:bg-[#1F2937]/50 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <Image src={selectedMarket.iconUrl} alt={selectedMarket.name} width={24} height={24} className="rounded-full" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium leading-none">{selectedMarket.hlCoin}-USD-PERP</span>
            <span className="text-[10px] text-gray-400 mt-1">{selectedMarket.name} - USD perpetual</span>
          </div>
          <ChevronDown className="size-4 opacity-50 ml-2" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px] bg-[#0F1318] border-[#1F2937] text-white">
          <DropdownMenuRadioGroup value={selectedMarketId} onValueChange={setSelectedMarketId}>
            {TRADE_MARKETS.map((market) => (
              <DropdownMenuRadioItem 
                key={market.id} 
                value={market.id} 
                className="focus:bg-[#1F2937] focus:text-white flex items-center gap-3 cursor-pointer py-2"
              >
                <Image src={market.iconUrl} alt={market.name} width={24} height={24} className="rounded-full" />
                <div className="flex flex-col items-start flex-1">
                  <span className="text-sm font-medium">{market.hlCoin}-USD-PERP</span>
                  <span className="text-xs text-gray-400">{market.name}</span>
                </div>
                <div className="text-end ml-auto">
                      <span className="shrink-0 font-mono text-xs font-medium text-gray-500">
                          {market.id}
                        </span>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <div>
            {/* price */}
            <div className="flex items-center gap-6 text-white">
  {/* last trade */}
  <div className="pl-3 border-l border-[#1F2937]">
    <div className="text-base font-mono font-medium">67,359.10</div>
    <div className="text-xs text-gray-400">
      <span className="text-green-500">+0.62%</span>
    </div>
  </div>
</div>
      </div>
    </header>
  );
};

export default TradingHeader;