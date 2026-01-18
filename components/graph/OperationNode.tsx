'use client';

import { memo, useMemo, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { OperationNodeData, OperationType } from '@/lib/types';
import { useGraphStore } from '@/lib/graph-store';
import { formatNumber } from '@/lib/monte-carlo';

const operationSymbols: Record<OperationType, string> = {
  multiply: '×',
  divide: '÷',
  add: '+',
  subtract: '−',
};

const operationColors: Record<OperationType, string> = {
  multiply: 'bg-blue-500',
  divide: 'bg-orange-500',
  add: 'bg-green-500',
  subtract: 'bg-red-500',
};

const operationNames: Record<OperationType, string> = {
  multiply: 'Multiply',
  divide: 'Divide',
  add: 'Add',
  subtract: 'Subtract',
};

// Create mini histogram bars from samples
function createMiniHistogram(samples: number[], bins: number = 15): number[] {
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

type OperationNodeType = Node<OperationNodeData, 'operation'>;

function OperationNodeComponent({ id, data, selected }: NodeProps<OperationNodeType>) {
  const [showDetails, setShowDetails] = useState(false);

  // Check if the label is different from just the operation name
  const hasCustomLabel = data.label && data.label !== data.operation;

  // Get simulation results for this node
  const nodeResult = useGraphStore((state) => state.nodeSimulationResults.get(id));

  // Create mini histogram
  const histogramBars = useMemo(() => {
    if (!nodeResult || nodeResult.samples.length === 0) return null;
    return createMiniHistogram(nodeResult.samples, 15);
  }, [nodeResult]);

  // Create larger histogram for detail view
  const detailHistogramBars = useMemo(() => {
    if (!nodeResult || nodeResult.samples.length === 0) return null;
    return createMiniHistogram(nodeResult.samples, 30);
  }, [nodeResult]);

  return (
    <>
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-lg font-bold ${operationColors[data.operation]}`}
              >
                {operationSymbols[data.operation]}
              </div>
              {hasCustomLabel ? data.label : operationNames[data.operation]}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Operation: <span className="text-foreground font-medium">{operationNames[data.operation]}</span>
            </div>

            {nodeResult && (
              <>
                {/* Large histogram */}
                <div className="space-y-1">
                  <div className="text-sm font-medium">Distribution</div>
                  <div className="h-24 flex items-end gap-px bg-muted/30 rounded p-2">
                    {detailHistogramBars?.map((height, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm ${operationColors[data.operation]}`}
                        style={{ height: `${height}%`, opacity: 0.8 }}
                      />
                    ))}
                  </div>
                  {/* X-axis labels */}
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-2">
                    <span>{formatNumber(nodeResult.percentiles.p5)}</span>
                    <span>{formatNumber(nodeResult.percentiles.p25)}</span>
                    <span className="text-primary font-medium">{formatNumber(nodeResult.percentiles.p50)}</span>
                    <span>{formatNumber(nodeResult.percentiles.p75)}</span>
                    <span>{formatNumber(nodeResult.percentiles.p95)}</span>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Mean</div>
                    <div className="font-mono font-medium">{formatNumber(nodeResult.mean)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Std Dev</div>
                    <div className="font-mono font-medium">{formatNumber(nodeResult.stdDev)}</div>
                  </div>
                </div>

                {/* Percentiles */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Percentiles</div>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-muted-foreground">P5</div>
                      <div className="font-mono">{formatNumber(nodeResult.percentiles.p5)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">P25</div>
                      <div className="font-mono">{formatNumber(nodeResult.percentiles.p25)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground font-medium">P50</div>
                      <div className="font-mono font-medium">{formatNumber(nodeResult.percentiles.p50)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">P75</div>
                      <div className="font-mono">{formatNumber(nodeResult.percentiles.p75)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">P95</div>
                      <div className="font-mono">{formatNumber(nodeResult.percentiles.p95)}</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!nodeResult && (
              <div className="text-sm text-muted-foreground italic">
                Run simulation to see results
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Card
        className={`p-3 min-w-[100px] cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}
        onDoubleClick={() => setShowDetails(true)}
      >
        <Handle
          type="target"
          position={Position.Left}
        id="a"
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
        style={{ top: '30%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="b"
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
        style={{ top: '70%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-primary border-2 border-background"
      />

      <div className="flex flex-col items-center gap-1.5">
        {/* Output name label at top */}
        {hasCustomLabel && (
          <span className="text-[11px] font-medium text-foreground whitespace-nowrap px-1">
            {data.label}
          </span>
        )}

        {/* Operation symbol */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm ${operationColors[data.operation]}`}
        >
          {operationSymbols[data.operation]}
        </div>

        {/* Operation type */}
        <span className="text-[9px] text-muted-foreground">
          {operationNames[data.operation]}
        </span>

        {/* Mini histogram when results available */}
        {histogramBars && nodeResult && (
          <div className="w-full mt-1.5 pt-1.5 border-t border-border/50">
            {/* Histogram bars */}
            <div className="h-6 flex items-end gap-px">
              {histogramBars.map((height, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${operationColors[data.operation]}`}
                  style={{ height: `${height}%`, opacity: 0.7 }}
                />
              ))}
            </div>

            {/* Median value */}
            <div className="text-[9px] text-center font-mono text-muted-foreground mt-0.5">
              ~{formatNumber(nodeResult.percentiles.p50)}
            </div>
          </div>
        )}
      </div>
      </Card>
    </>
  );
}

export const OperationNode = memo(OperationNodeComponent);
