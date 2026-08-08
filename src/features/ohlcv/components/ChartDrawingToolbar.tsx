'use client';

import { Crosshair, Eraser, MousePointer2, RotateCcw } from 'lucide-react';

import { cn } from '@/src/lib/utils';

export type DrawingTool = 'cursor' | 'horizontal-line';

type ChartDrawingToolbarProps = {
    activeTool: DrawingTool;
    onToolChange: (tool: DrawingTool) => void;
    onClear: () => void;
    onReset: () => void;
};

const toolButton =
    'flex size-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-white/8 hover:text-gray-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F0B90B]';

export function ChartDrawingToolbar({ activeTool, onToolChange, onClear, onReset }: ChartDrawingToolbarProps) {
    return (
        <aside
            className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-md border border-white/10 bg-[#0d1117]/95 p-1 shadow-lg backdrop-blur-sm sm:bottom-auto sm:left-2 sm:top-2 sm:translate-x-0 sm:flex-col"
            aria-label="Chart drawing controls"
        >
            <button type="button" className={cn(toolButton, activeTool === 'cursor' && 'bg-[#F0B90B]/12 text-[#F0B90B]')} onClick={() => onToolChange('cursor')} aria-label="Cursor and pan tool" title="Cursor and pan">
                <MousePointer2 className="size-4" aria-hidden />
            </button>
            <button type="button" className={cn(toolButton, activeTool === 'horizontal-line' && 'bg-[#F0B90B]/12 text-[#F0B90B]')} onClick={() => onToolChange('horizontal-line')} aria-label="Draw horizontal price line" title="Draw horizontal price line">
                <Crosshair className="size-4" aria-hidden />
            </button>
            <span className="h-5 w-px bg-white/10 sm:h-px sm:w-5" aria-hidden />
            <button type="button" className={toolButton} onClick={onClear} aria-label="Clear price lines" title="Clear price lines">
                <Eraser className="size-4" aria-hidden />
            </button>
            <button type="button" className={toolButton} onClick={onReset} aria-label="Reset chart view" title="Reset chart view">
                <RotateCcw className="size-4" aria-hidden />
            </button>
        </aside>
    );
}
