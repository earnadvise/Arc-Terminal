'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Candlestick } from '@/utils/mockData';
import { Settings, Eye, Maximize2, Trash2, TrendingUp, BarChart2 } from 'lucide-react';

interface ChartProps {
  data: Candlestick[];
  symbol: string;
  timeframe: string;
  setTimeframe: (t: string) => void;
}

export default function CandlestickChart({ data, symbol, timeframe, setTimeframe }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIndicators, setShowIndicators] = useState(true);

  // Resize canvas handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight - 48; // subtract controls height
      drawChart();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Trigger redraw when fullscreen changes or indicators toggle
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [data, hoverIndex, hoverCoord, isFullscreen, showIndicators]);

  // Main Canvas drawing logic
  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#09090c';
    ctx.fillRect(0, 0, width, height);

    // Padding settings
    const paddingRight = 75; // for price axis
    const paddingBottom = 25; // for time axis
    const paddingTop = 20;
    const paddingLeft = 10;

    const chartWidth = width - paddingRight - paddingLeft;
    const chartHeight = height - paddingTop - paddingBottom;

    // Calculate Min & Max Prices
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    data.forEach(d => {
      if (d.low < minPrice) minPrice = d.low;
      if (d.high > maxPrice) maxPrice = d.high;
      if (d.volume > maxVolume) maxVolume = d.volume;
    });

    // Add padding to price range
    const priceDiff = maxPrice - minPrice;
    maxPrice += priceDiff * 0.1;
    minPrice -= priceDiff * 0.1;
    if (minPrice < 0) minPrice = 0;

    const finalPriceDiff = maxPrice - minPrice;

    // Helper functions for coordinates
    const getX = (index: number) => {
      const spacing = chartWidth / data.length;
      return paddingLeft + index * spacing + spacing / 2;
    };

    const getY = (price: number) => {
      return paddingTop + chartHeight - ((price - minPrice) / finalPriceDiff) * chartHeight;
    };

    // Draw Grid Lines (Horizontal / Price)
    ctx.strokeStyle = '#13131a';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = '#6e6e7f';
    ctx.textAlign = 'left';

    const gridLinesCount = 5;
    for (let i = 0; i <= gridLinesCount; i++) {
      const price = minPrice + (finalPriceDiff / gridLinesCount) * i;
      const y = getY(price);
      
      // Draw grid line
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartWidth, y);
      ctx.stroke();

      // Draw price label
      ctx.fillText(price.toLocaleString(undefined, { minimumFractionDigits: symbol.startsWith('jpy') ? 6 : 2 }), paddingLeft + chartWidth + 5, y + 4);
    }

    // Draw Grid Lines (Vertical / Time)
    const timeLabelsInterval = Math.max(1, Math.floor(data.length / 6));
    ctx.textAlign = 'center';
    data.forEach((d, index) => {
      if (index % timeLabelsInterval === 0) {
        const x = getX(index);
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, paddingTop + chartHeight);
        ctx.stroke();

        ctx.fillText(d.time, x, paddingTop + chartHeight + 15);
      }
    });

    // Draw Volume Bars (lower 20% of the chart height)
    const volumeHeightLimit = chartHeight * 0.2;
    data.forEach((d, index) => {
      const x = getX(index);
      const isGreen = d.close >= d.open;
      const colWidth = (chartWidth / data.length) * 0.7;
      const volHeight = (d.volume / maxVolume) * volumeHeightLimit;
      const y = paddingTop + chartHeight - volHeight;

      ctx.fillStyle = isGreen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(x - colWidth / 2, y, colWidth, volHeight);
    });

    // Draw Simple Moving Average (SMA - 7 period) indicator if enabled
    if (showIndicators && data.length > 7) {
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      for (let i = 6; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < 7; j++) {
          sum += data[i - j].close;
        }
        const smaVal = sum / 7;
        const x = getX(i);
        const y = getY(smaVal);

        if (i === 6) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Draw Candlesticks
    data.forEach((d, index) => {
      const x = getX(index);
      const openY = getY(d.open);
      const closeY = getY(d.close);
      const highY = getY(d.high);
      const lowY = getY(d.low);
      const isGreen = d.close >= d.open;

      const colWidth = (chartWidth / data.length) * 0.7;

      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1.5;

      // Draw Wicks
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw Body
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.fillRect(x - colWidth / 2, Math.min(openY, closeY), colWidth, Math.max(1, Math.abs(openY - closeY)));
    });

    // Draw Crosshair (if hover coord exists)
    if (hoverCoord && hoverCoord.x < chartWidth + paddingLeft && hoverCoord.y < chartHeight + paddingTop) {
      // Horizontal Line
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, hoverCoord.y);
      ctx.lineTo(paddingLeft + chartWidth, hoverCoord.y);
      ctx.stroke();

      // Vertical Line
      ctx.beginPath();
      ctx.moveTo(hoverCoord.x, paddingTop);
      ctx.lineTo(hoverCoord.x, paddingTop + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]); // Reset

      // Hover Price tooltip
      const relativePrice = maxPrice - ((hoverCoord.y - paddingTop) / chartHeight) * finalPriceDiff;
      if (relativePrice >= minPrice && relativePrice <= maxPrice) {
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(paddingLeft + chartWidth + 2, hoverCoord.y - 10, 70, 20);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(relativePrice.toLocaleString(undefined, { minimumFractionDigits: symbol.startsWith('jpy') ? 5 : 2 }), paddingLeft + chartWidth + 6, hoverCoord.y + 3);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const paddingLeft = 10;
    const paddingRight = 75;
    const chartWidth = canvas.width - paddingRight - paddingLeft;
    
    // Calculate index from x
    const spacing = chartWidth / data.length;
    const index = Math.min(data.length - 1, Math.max(0, Math.floor((x - paddingLeft) / spacing)));

    setHoverIndex(index);
    setHoverCoord({ x, y });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverCoord(null);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const selectedCandle = hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-col bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-xl overflow-hidden p-4 shadow-xl ${
        isFullscreen ? 'h-screen w-screen p-6' : 'h-[460px] w-full'
      }`}
    >
      {/* Chart Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-[#1f1f2e] pb-3 mb-3">
        {/* Left Side: Pair & Price details */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-900 dark:text-white tracking-wide">{symbol}</span>
            <span className="text-xs bg-slate-100 dark:bg-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] px-2 py-0.5 rounded uppercase">{timeframe}</span>
          </div>

          {selectedCandle && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-[#8a8a9e] number-mono">
              <span>O: <span className={selectedCandle.close >= selectedCandle.open ? 'text-[#10b981]' : 'text-[#ef4444]'}>${selectedCandle.open.toLocaleString(undefined, { minimumFractionDigits: symbol.startsWith('jpy') ? 6 : 2 })}</span></span>
              <span>H: <span className="text-slate-900 dark:text-white">${selectedCandle.high.toLocaleString(undefined, { minimumFractionDigits: symbol.startsWith('jpy') ? 6 : 2 })}</span></span>
              <span>L: <span className="text-slate-900 dark:text-white">${selectedCandle.low.toLocaleString(undefined, { minimumFractionDigits: symbol.startsWith('jpy') ? 6 : 2 })}</span></span>
              <span>C: <span className={selectedCandle.close >= selectedCandle.open ? 'text-[#10b981]' : 'text-[#ef4444]'}>${selectedCandle.close.toLocaleString(undefined, { minimumFractionDigits: symbol.startsWith('jpy') ? 6 : 2 })}</span></span>
              <span>V: <span className="text-[#3b82f6]">{selectedCandle.volume.toLocaleString()}</span></span>
            </div>
          )}
        </div>

        {/* Right Side: Options selectors */}
        <div className="flex items-center gap-3">
          {/* Timeframes */}
          <div className="flex items-center bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] rounded-lg p-0.5">
            {['1m', '5m', '15m', '1h', '4h', '1D'].map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                  timeframe === t 
                    ? 'bg-gradient-to-r from-[#3b82f6]/20 to-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/35' 
                    : 'text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-100 dark:bg-[#1f1f2e]" />

          {/* Indicators Button */}
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            className={`p-1.5 rounded-lg border transition-all ${
              showIndicators 
                ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/40 text-[#8b5cf6]' 
                : 'bg-slate-50 dark:bg-[#0c0c10] border-slate-200 dark:border-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white'
            }`}
            title="SMA Indicator (7 period)"
          >
            <TrendingUp size={14} />
          </button>

          {/* Drawing Tools Toggle */}
          <button
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white transition-all"
            title="Drawings / Grid Options"
          >
            <BarChart2 size={14} />
          </button>

          {/* Settings */}
          <button
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white transition-all"
            title="Chart Settings"
          >
            <Settings size={14} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white transition-all"
            title="Fullscreen Toggle"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative min-h-[300px]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block cursor-crosshair rounded-lg"
        />
      </div>
    </div>
  );
}
