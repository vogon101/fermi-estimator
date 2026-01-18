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
import type { ClampNodeData } from '@/lib/types';
import { formatNumber } from '@/lib/monte-carlo';
import { useGraphStore } from '@/lib/graph-store';

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

type ClampNodeType = Node<ClampNodeData, 'clamp'>;

function ClampNodeComponent({ id, data, selected }: NodeProps<ClampNodeType>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    label: data.label,
    min: data.min ?? '',
    max: data.max ?? '',
  });

  const updateNode = useGraphStore((state) => state.updateNode);
  const nodeResult = useGraphStore((state) => state.nodeSimulationResults.get(id));

  const hasCustomLabel = data.label && data.label !== 'Clamp';

  const histogramBars = useMemo(() => {
    if (!nodeResult || nodeResult.samples.length === 0) return null;
    return createMiniHistogram(nodeResult.samples, 15);
  }, [nodeResult]);

  const handleSave = () => {
    updateNode(id, {
      label: editData.label,
      min: editData.min !== '' ? Number(editData.min) : undefined,
      max: editData.max !== '' ? Number(editData.max) : undefined,
    });
    setIsEditing(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditData({
      label: data.label,
      min: data.min ?? '',
      max: data.max ?? '',
    });
    setIsEditing(true);
  };

  // Build display string
  const boundsDisplay = useMemo(() => {
    if (data.min !== undefined && data.max !== undefined) {
      return `[${formatNumber(data.min)}, ${formatNumber(data.max)}]`;
    } else if (data.min !== undefined) {
      return `≥ ${formatNumber(data.min)}`;
    } else if (data.max !== undefined) {
      return `≤ ${formatNumber(data.max)}`;
    }
    return 'no bounds';
  }, [data.min, data.max]);

  return (
    <>
      <Card
        className={`p-3 min-w-[100px] cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}
        onDoubleClick={handleDoubleClick}
      >
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="w-3 h-3 bg-muted-foreground border-2 border-background"
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

          {/* Clamp symbol */}
          <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center text-white shadow-sm">
            <span className="text-lg font-bold">⌗</span>
          </div>

          {/* Clamp label */}
          <span className="text-[9px] text-muted-foreground">
            Clamp
          </span>

          {/* Bounds display */}
          <span className="text-[9px] font-mono text-muted-foreground">
            {boundsDisplay}
          </span>

          {/* Mini histogram */}
          {histogramBars && nodeResult && (
            <div className="w-full mt-1.5 pt-1.5 border-t border-border/50">
              <div className="h-6 flex items-end gap-px">
                {histogramBars.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-yellow-500"
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
            <DialogTitle>Edit Clamp</DialogTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="min">Minimum</Label>
                <Input
                  id="min"
                  type="number"
                  value={editData.min}
                  onChange={(e) => setEditData({ ...editData, min: e.target.value })}
                  placeholder="No min"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max">Maximum</Label>
                <Input
                  id="max"
                  type="number"
                  value={editData.max}
                  onChange={(e) => setEditData({ ...editData, max: e.target.value })}
                  placeholder="No max"
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              <p>Constrains the input value to be within the specified bounds. Leave empty for no constraint on that side.</p>
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

export const ClampNode = memo(ClampNodeComponent);
