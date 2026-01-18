'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { createHistogramData, formatNumber } from '@/lib/monte-carlo';

interface DistributionChartProps {
  samples: number[];
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
}

export function DistributionChart({ samples, percentiles }: DistributionChartProps) {
  const histogramData = useMemo(() => {
    return createHistogramData(samples, 40);
  }, [samples]);

  // Find bin indices for percentile lines
  const findBinIndex = (value: number) => {
    for (let i = 0; i < histogramData.length; i++) {
      const [binStart, binEnd] = histogramData[i].range;
      if (value >= binStart && value < binEnd) {
        return i;
      }
    }
    return histogramData.length - 1;
  };

  const p5Index = findBinIndex(percentiles.p5);
  const p50Index = findBinIndex(percentiles.p50);
  const p95Index = findBinIndex(percentiles.p95);

  if (histogramData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
        No data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={histogramData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <XAxis
          dataKey="bin"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          interval="preserveStartEnd"
          tickFormatter={(value, index) => {
            // Only show a few ticks
            if (
              index === 0 ||
              index === Math.floor(histogramData.length / 2) ||
              index === histogramData.length - 1
            ) {
              return value;
            }
            return '';
          }}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                  <p className="font-medium">
                    Range: {formatNumber(data.range[0])} - {formatNumber(data.range[1])}
                  </p>
                  <p className="text-muted-foreground">Count: {data.count}</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="count"
          fill="hsl(var(--primary))"
          radius={[2, 2, 0, 0]}
        />
        {/* Percentile reference lines */}
        <ReferenceLine
          x={histogramData[p5Index]?.bin}
          stroke="hsl(var(--destructive))"
          strokeDasharray="3 3"
          label={{
            value: 'P5',
            position: 'top',
            fill: 'hsl(var(--destructive))',
            fontSize: 10,
          }}
        />
        <ReferenceLine
          x={histogramData[p50Index]?.bin}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          label={{
            value: 'P50',
            position: 'top',
            fill: 'hsl(var(--primary))',
            fontSize: 10,
          }}
        />
        <ReferenceLine
          x={histogramData[p95Index]?.bin}
          stroke="hsl(var(--destructive))"
          strokeDasharray="3 3"
          label={{
            value: 'P95',
            position: 'top',
            fill: 'hsl(var(--destructive))',
            fontSize: 10,
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
