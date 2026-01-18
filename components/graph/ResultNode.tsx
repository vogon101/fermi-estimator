'use client';

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import type { ResultNodeData } from '@/lib/types';
import { formatNumber } from '@/lib/monte-carlo';

type ResultNodeType = Node<ResultNodeData, 'result'>;

function ResultNodeComponent({ data, selected }: NodeProps<ResultNodeType>) {
  const result = data.simulationResult;

  return (
    <Card className={`p-3 min-w-[200px] bg-primary/5 border-primary/20 ${selected ? 'ring-2 ring-primary' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-semibold text-sm">{data.label}</span>
        </div>

        {result ? (
          <>
            <div className="bg-background rounded-lg p-2">
              <div className="text-xs text-muted-foreground">Median (P50)</div>
              <div className="text-2xl font-bold font-mono">
                {formatNumber(result.percentiles.p50)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-background rounded p-1.5">
                <div className="text-muted-foreground">P5</div>
                <div className="font-mono font-medium">{formatNumber(result.percentiles.p5)}</div>
              </div>
              <div className="bg-background rounded p-1.5">
                <div className="text-muted-foreground">P95</div>
                <div className="font-mono font-medium">{formatNumber(result.percentiles.p95)}</div>
              </div>
            </div>

            {/* Mini histogram */}
            <div className="h-8 flex items-end gap-px">
              {createMiniHistogram(result.samples).map((height, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/60 rounded-t-sm"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>

            <div className="text-[10px] text-muted-foreground text-center">
              {result.samples.length.toLocaleString()} samples
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            Run simulation to see results
          </div>
        )}
      </div>
    </Card>
  );
}

function createMiniHistogram(samples: number[], bins: number = 20): number[] {
  if (samples.length === 0) return Array(bins).fill(0);

  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const binWidth = (max - min) / bins;

  const counts = Array(bins).fill(0);
  for (const sample of samples) {
    const binIndex = Math.min(Math.floor((sample - min) / binWidth), bins - 1);
    counts[binIndex]++;
  }

  const maxCount = Math.max(...counts);
  return counts.map((count) => (maxCount > 0 ? (count / maxCount) * 100 : 0));
}

export const ResultNode = memo(ResultNodeComponent);
