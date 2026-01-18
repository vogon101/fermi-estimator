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
import type { FunctionNodeData, FunctionType } from '@/lib/types';
import { formatNumber } from '@/lib/monte-carlo';
import { useGraphStore } from '@/lib/graph-store';

// Function display info
const functionInfo: Record<FunctionType, { symbol: string; name: string; color: string; inputs: number }> = {
  sqrt: { symbol: '√', name: 'Square Root', color: 'bg-purple-500', inputs: 1 },
  square: { symbol: 'x²', name: 'Square', color: 'bg-purple-500', inputs: 1 },
  pow: { symbol: 'xⁿ', name: 'Power', color: 'bg-purple-500', inputs: 1 },
  exp: { symbol: 'eˣ', name: 'Exponential', color: 'bg-purple-500', inputs: 1 },
  log: { symbol: 'ln', name: 'Natural Log', color: 'bg-purple-500', inputs: 1 },
  log10: { symbol: 'log₁₀', name: 'Log Base 10', color: 'bg-purple-500', inputs: 1 },
  log2: { symbol: 'log₂', name: 'Log Base 2', color: 'bg-purple-500', inputs: 1 },
  abs: { symbol: '|x|', name: 'Absolute Value', color: 'bg-teal-500', inputs: 1 },
  ceil: { symbol: '⌈x⌉', name: 'Ceiling', color: 'bg-teal-500', inputs: 1 },
  floor: { symbol: '⌊x⌋', name: 'Floor', color: 'bg-teal-500', inputs: 1 },
  round: { symbol: '≈', name: 'Round', color: 'bg-teal-500', inputs: 1 },
  sin: { symbol: 'sin', name: 'Sine', color: 'bg-pink-500', inputs: 1 },
  cos: { symbol: 'cos', name: 'Cosine', color: 'bg-pink-500', inputs: 1 },
  tan: { symbol: 'tan', name: 'Tangent', color: 'bg-pink-500', inputs: 1 },
  min: { symbol: 'min', name: 'Minimum', color: 'bg-cyan-500', inputs: 2 },
  max: { symbol: 'max', name: 'Maximum', color: 'bg-cyan-500', inputs: 2 },
  custom: { symbol: 'f(x)', name: 'Custom', color: 'bg-amber-500', inputs: 1 },
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

type FunctionNodeType = Node<FunctionNodeData, 'function'>;

function FunctionNodeComponent({ id, data, selected }: NodeProps<FunctionNodeType>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    label: data.label,
    function: data.function,
    parameter: data.parameter ?? '',
  });

  const updateNode = useGraphStore((state) => state.updateNode);
  const nodeResult = useGraphStore((state) => state.nodeSimulationResults.get(id));

  const info = functionInfo[data.function];
  const hasCustomLabel = data.label && data.label !== data.function && data.label !== info.name;

  const histogramBars = useMemo(() => {
    if (!nodeResult || nodeResult.samples.length === 0) return null;
    return createMiniHistogram(nodeResult.samples, 15);
  }, [nodeResult]);

  const handleSave = () => {
    updateNode(id, {
      label: editData.label,
      function: editData.function,
      parameter: editData.parameter || undefined,
    });
    setIsEditing(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditData({
      label: data.label,
      function: data.function,
      parameter: data.parameter ?? '',
    });
    setIsEditing(true);
  };

  // Determine number of input handles
  const numInputs = info.inputs;

  return (
    <>
      <Card
        className={`p-3 min-w-[100px] cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}
        onDoubleClick={handleDoubleClick}
      >
        {/* Input handles */}
        {numInputs === 1 ? (
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="w-3 h-3 bg-muted-foreground border-2 border-background"
          />
        ) : (
          <>
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
          </>
        )}
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

          {/* Function symbol */}
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm ${info.color}`}
          >
            {info.symbol}
          </div>

          {/* Function name */}
          <span className="text-[9px] text-muted-foreground">
            {info.name}
          </span>

          {/* Parameter display for pow/custom */}
          {data.function === 'pow' && data.parameter !== undefined && (
            <span className="text-[9px] text-muted-foreground font-mono">
              n = {data.parameter}
            </span>
          )}
          {data.function === 'custom' && data.parameter && (
            <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[80px]" title={String(data.parameter)}>
              {data.parameter}
            </span>
          )}

          {/* Mini histogram */}
          {histogramBars && nodeResult && (
            <div className="w-full mt-1.5 pt-1.5 border-t border-border/50">
              <div className="h-6 flex items-end gap-px">
                {histogramBars.map((height, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm ${info.color}`}
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
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Function</DialogTitle>
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
              <Label>Function</Label>
              <Select
                value={editData.function}
                onValueChange={(value: FunctionType) => setEditData({ ...editData, function: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sqrt">√x - Square Root</SelectItem>
                  <SelectItem value="square">x² - Square</SelectItem>
                  <SelectItem value="pow">xⁿ - Power</SelectItem>
                  <SelectItem value="exp">eˣ - Exponential</SelectItem>
                  <SelectItem value="log">ln(x) - Natural Log</SelectItem>
                  <SelectItem value="log10">log₁₀(x) - Log Base 10</SelectItem>
                  <SelectItem value="log2">log₂(x) - Log Base 2</SelectItem>
                  <SelectItem value="abs">|x| - Absolute Value</SelectItem>
                  <SelectItem value="ceil">⌈x⌉ - Ceiling</SelectItem>
                  <SelectItem value="floor">⌊x⌋ - Floor</SelectItem>
                  <SelectItem value="round">≈ - Round</SelectItem>
                  <SelectItem value="sin">sin(x) - Sine</SelectItem>
                  <SelectItem value="cos">cos(x) - Cosine</SelectItem>
                  <SelectItem value="tan">tan(x) - Tangent</SelectItem>
                  <SelectItem value="min">min(a,b) - Minimum</SelectItem>
                  <SelectItem value="max">max(a,b) - Maximum</SelectItem>
                  <SelectItem value="custom">f(x) - Custom Expression</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editData.function === 'pow' && (
              <div className="grid gap-2">
                <Label htmlFor="exponent">Exponent (n)</Label>
                <Input
                  id="exponent"
                  type="number"
                  value={editData.parameter}
                  onChange={(e) => setEditData({ ...editData, parameter: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 2 for square, 0.5 for sqrt"
                />
              </div>
            )}

            {editData.function === 'custom' && (
              <div className="grid gap-2">
                <Label htmlFor="expression">Expression (use x for input)</Label>
                <Input
                  id="expression"
                  value={editData.parameter}
                  onChange={(e) => setEditData({ ...editData, parameter: e.target.value })}
                  placeholder="e.g., x * 2 + 1, x^2 - 5"
                />
                <p className="text-xs text-muted-foreground">
                  Supported: +, -, *, /, ^, sqrt, log, exp, sin, cos, tan, abs, pi, e
                </p>
              </div>
            )}
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

export const FunctionNode = memo(FunctionNodeComponent);
