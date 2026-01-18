'use client';

import { memo, useMemo, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ConditionalNodeData, ComparisonType } from '@/lib/types';
import { formatNumber } from '@/lib/monte-carlo';
import { useGraphStore } from '@/lib/graph-store';

const comparisonSymbols: Record<ComparisonType, string> = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  eq: '=',
  neq: '≠',
};

const comparisonNames: Record<ComparisonType, string> = {
  gt: 'Greater than',
  gte: 'Greater or equal',
  lt: 'Less than',
  lte: 'Less or equal',
  eq: 'Equal to',
  neq: 'Not equal to',
};

// Create mini histogram bars from samples
function createMiniHistogram(samples: number[], bins: number = 15): number[] {
  if (samples.length === 0) return Array(bins).fill(0);
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const binWidth = (max - min) / bins || 1;
  const counts = Array(bins).fill(0);
  for (const sample of samples) {
    const binIndex = Math.min(Math.floor((sample - min) / binWidth), bins - 1);
    counts[binIndex]++;
  }
  const maxCount = Math.max(...counts);
  return counts.map((count) => (maxCount > 0 ? (count / maxCount) * 100 : 0));
}

type ConditionalNodeType = Node<ConditionalNodeData, 'conditional'>;

function ConditionalNodeComponent({ id, data, selected }: NodeProps<ConditionalNodeType>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    label: data.label,
    comparison: data.comparison,
  });

  const updateNode = useGraphStore((state) => state.updateNode);
  const nodeResult = useGraphStore((state) => state.nodeSimulationResults.get(id));

  const hasCustomLabel = data.label && data.label !== 'Conditional';

  const histogramBars = useMemo(() => {
    if (!nodeResult || nodeResult.samples.length === 0) return null;
    return createMiniHistogram(nodeResult.samples, 15);
  }, [nodeResult]);

  const handleSave = () => {
    updateNode(id, {
      label: editData.label,
      comparison: editData.comparison,
    });
    setIsEditing(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditData({
      label: data.label,
      comparison: data.comparison,
    });
    setIsEditing(true);
  };

  return (
    <>
      <Card
        className={`p-3 min-w-[120px] cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}
        onDoubleClick={handleDoubleClick}
      >
        {/* Input handles: condition (a vs b), then-value, else-value */}
        <Handle
          type="target"
          position={Position.Left}
          id="a"
          className="w-3 h-3 bg-muted-foreground border-2 border-background"
          style={{ top: '20%' }}
          title="Value A (left side of comparison)"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="b"
          className="w-3 h-3 bg-muted-foreground border-2 border-background"
          style={{ top: '40%' }}
          title="Value B (right side of comparison)"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="then"
          className="w-3 h-3 bg-green-500 border-2 border-background"
          style={{ top: '60%' }}
          title="Then value (if true)"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="else"
          className="w-3 h-3 bg-red-500 border-2 border-background"
          style={{ top: '80%' }}
          title="Else value (if false)"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-primary border-2 border-background"
        />

        <div className="flex flex-col items-center gap-1.5">
          {/* Label */}
          {hasCustomLabel && (
            <span className="text-[11px] font-medium text-foreground whitespace-nowrap px-1">
              {data.label}
            </span>
          )}

          {/* Conditional symbol */}
          <div className="w-12 h-12 rounded-lg bg-indigo-500 flex flex-col items-center justify-center text-white shadow-sm">
            <span className="text-lg font-bold">{comparisonSymbols[data.comparison]}</span>
            <span className="text-[8px]">if</span>
          </div>

          {/* Comparison type */}
          <span className="text-[9px] text-muted-foreground">
            {comparisonNames[data.comparison]}
          </span>

          {/* Input labels */}
          <div className="text-[8px] text-muted-foreground space-y-0.5 w-full">
            <div className="flex justify-between">
              <span className="text-green-600">● then</span>
              <span className="text-red-600">● else</span>
            </div>
          </div>

          {/* Mini histogram */}
          {histogramBars && nodeResult && (
            <div className="w-full mt-1.5 pt-1.5 border-t border-border/50">
              <div className="h-6 flex items-end gap-px">
                {histogramBars.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-indigo-500"
                    style={{ height: `${height}%`, opacity: 0.7 }}
                  />
                ))}
              </div>
              <div className="text-[9px] text-center font-mono text-muted-foreground mt-0.5">
                ~{formatNumber(nodeResult.percentiles.p50)}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Edit Conditional</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={editData.label}
                onChange={(e) => setEditData({ ...editData, label: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Comparison</Label>
              <Select
                value={editData.comparison}
                onValueChange={(value: ComparisonType) => setEditData({ ...editData, comparison: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">{'>'} Greater than</SelectItem>
                  <SelectItem value="gte">{'≥'} Greater or equal</SelectItem>
                  <SelectItem value="lt">{'<'} Less than</SelectItem>
                  <SelectItem value="lte">{'≤'} Less or equal</SelectItem>
                  <SelectItem value="eq">{'='} Equal to</SelectItem>
                  <SelectItem value="neq">{'≠'} Not equal to</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              <p className="font-medium mb-1">How it works:</p>
              <p>If A {comparisonSymbols[editData.comparison]} B is true, output the &quot;then&quot; value, otherwise output the &quot;else&quot; value.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const ConditionalNode = memo(ConditionalNodeComponent);
