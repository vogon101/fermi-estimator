'use client';

import { memo, useMemo, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import type { AssumptionNodeData, Confidence, Distribution } from '@/lib/types';
import { formatNumber } from '@/lib/monte-carlo';
import { useGraphStore } from '@/lib/graph-store';

const confidenceColors: Record<Confidence, string> = {
  low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

type AssumptionNodeType = Node<AssumptionNodeData, 'assumption'>;

// Generate distribution curve points for SVG
function generateDistributionPath(
  distribution: Distribution,
  width: number,
  height: number
): string {
  const points: [number, number][] = [];
  const steps = 50;

  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const t = i / steps; // 0 to 1
    let y: number;

    switch (distribution) {
      case 'uniform':
        // Flat line with small ramps at edges
        if (t < 0.1) y = t * 10;
        else if (t > 0.9) y = (1 - t) * 10;
        else y = 1;
        break;
      case 'normal':
        // Bell curve: e^(-((x-0.5)^2) / 0.05)
        y = Math.exp(-Math.pow(t - 0.5, 2) / 0.05);
        break;
      case 'lognormal':
        // Skewed right: lognormal-like shape
        if (t <= 0) y = 0;
        else {
          const lt = t * 2.5 + 0.1; // shift and scale
          y = Math.exp(-Math.pow(Math.log(lt), 2) / 0.8) / lt;
        }
        break;
      default:
        y = 0.5;
    }

    // Normalize and flip y (SVG y is inverted)
    const normalizedY = height - y * height * 0.85 - 2;
    points.push([x, Math.max(2, normalizedY)]);
  }

  // Create SVG path
  const pathData = points
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(' ');

  return pathData;
}

// Distribution visualization component (reusable for mini and large)
function DistributionGraph({
  distribution,
  min,
  max,
  width,
  height,
  showLabels = true,
  gradientId,
}: {
  distribution: Distribution;
  min: number;
  max: number;
  width: number;
  height: number;
  showLabels?: boolean;
  gradientId: string;
}) {
  const path = useMemo(
    () => generateDistributionPath(distribution, width, height),
    [distribution, width, height]
  );

  // Calculate a "most likely" point for display
  const mostLikely = useMemo(() => {
    switch (distribution) {
      case 'uniform':
        return (min + max) / 2;
      case 'normal':
        return (min + max) / 2;
      case 'lognormal':
        // Mode is shifted left
        return min + (max - min) * 0.25;
      default:
        return (min + max) / 2;
    }
  }, [distribution, min, max]);

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        {/* Gradient fill under curve */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Filled area under curve */}
        <path
          d={`${path} L ${width} ${height} L 0 ${height} Z`}
          fill={`url(#${gradientId})`}
          className="text-primary"
        />

        {/* Distribution curve */}
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />

        {/* Min/Max markers */}
        <line x1="0" y1={height - 2} x2="0" y2={height} stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
        <line x1={width} y1={height - 2} x2={width} y2={height} stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
      </svg>

      {/* Labels */}
      {showLabels && (
        <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-0.5">
          <span>{formatNumber(min)}</span>
          <span className="text-primary font-medium">~{formatNumber(mostLikely)}</span>
          <span>{formatNumber(max)}</span>
        </div>
      )}
    </div>
  );
}

// Mini distribution visualization component
function MiniDistribution({ distribution, min, max }: { distribution: Distribution; min: number; max: number }) {
  return (
    <DistributionGraph
      distribution={distribution}
      min={min}
      max={max}
      width={140}
      height={32}
      gradientId={`grad-mini-${distribution}`}
    />
  );
}

// Large distribution visualization for detail view
function LargeDistribution({ distribution, min, max }: { distribution: Distribution; min: number; max: number }) {
  // Calculate statistics for display
  const stats = useMemo(() => {
    const mean = distribution === 'lognormal'
      ? min + (max - min) * 0.4  // Approximate for lognormal
      : (min + max) / 2;

    const mode = distribution === 'lognormal'
      ? min + (max - min) * 0.25
      : (min + max) / 2;

    // Rough approximation of standard deviation
    const stdDev = (max - min) / (distribution === 'normal' ? 4 : distribution === 'lognormal' ? 3 : Math.sqrt(12));

    return { mean, mode, stdDev };
  }, [distribution, min, max]);

  // Generate x-axis tick values
  const xAxisTicks = useMemo(() => {
    const range = max - min;
    return [
      min,
      min + range * 0.25,
      min + range * 0.5,
      min + range * 0.75,
      max,
    ];
  }, [min, max]);

  return (
    <div className="space-y-1">
      <DistributionGraph
        distribution={distribution}
        min={min}
        max={max}
        width={320}
        height={80}
        showLabels={false}
        gradientId={`grad-large-${distribution}`}
      />

      {/* X-axis labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0">
        {xAxisTicks.map((tick, i) => (
          <span key={i} className={i === 2 ? 'text-primary font-medium' : ''}>
            {formatNumber(tick)}
          </span>
        ))}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-2 text-xs pt-3 mt-2 border-t">
        <div className="text-center">
          <div className="text-muted-foreground">Min</div>
          <div className="font-mono font-medium">{formatNumber(min)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Expected</div>
          <div className="font-mono font-medium">{formatNumber(stats.mean)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Max</div>
          <div className="font-mono font-medium">{formatNumber(max)}</div>
        </div>
      </div>
    </div>
  );
}

function AssumptionNodeComponent({ id, data, selected }: NodeProps<AssumptionNodeType>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: data.name,
    min: data.min,
    max: data.max,
    distribution: data.distribution,
    unit: data.unit || '',
    description: data.description || '',
    confidence: data.confidence || 'medium' as Confidence,
  });

  const updateNode = useGraphStore((state) => state.updateNode);

  const handleSave = () => {
    updateNode(id, {
      name: editData.name,
      label: editData.name,
      min: editData.min,
      max: editData.max,
      distribution: editData.distribution,
      unit: editData.unit || undefined,
      description: editData.description || undefined,
      confidence: editData.confidence,
    });
    setIsEditing(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditData({
      name: data.name,
      min: data.min,
      max: data.max,
      distribution: data.distribution,
      unit: data.unit || '',
      description: data.description || '',
      confidence: data.confidence || 'medium',
    });
    setIsEditing(true);
  };

  return (
    <>
      <Card
        className={`p-3 min-w-[180px] max-w-[200px] cursor-pointer hover:shadow-md transition-shadow ${selected ? 'ring-2 ring-primary' : ''}`}
        onDoubleClick={handleDoubleClick}
      >
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-primary border-2 border-background"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate" title={data.label}>{data.label}</span>
            {data.confidence && (
              <Badge variant="secondary" className={`text-[10px] px-1 ${confidenceColors[data.confidence]}`}>
                {data.confidence}
              </Badge>
            )}
          </div>

          {/* Mini distribution graph */}
          <MiniDistribution distribution={data.distribution} min={data.min} max={data.max} />

          {/* Distribution type badge */}
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              {data.distribution}
            </Badge>
            {data.unit && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {data.unit}
              </Badge>
            )}
          </div>

          {data.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-2">
              {data.description}
            </p>
          )}

          {data.source && (
            <p className="text-[10px] text-blue-600 dark:text-blue-400 line-clamp-1" title={data.source}>
              📚 {data.source}
            </p>
          )}

          <p className="text-[9px] text-muted-foreground/50 text-center">
            Double-click to edit
          </p>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Assumption</DialogTitle>
          </DialogHeader>

          {/* Large distribution preview */}
          <div className="py-2">
            <LargeDistribution
              distribution={editData.distribution}
              min={editData.min}
              max={editData.max}
            />
          </div>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="min">Minimum</Label>
                <Input
                  id="min"
                  type="number"
                  value={editData.min}
                  onChange={(e) => setEditData({ ...editData, min: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max">Maximum</Label>
                <Input
                  id="max"
                  type="number"
                  value={editData.max}
                  onChange={(e) => setEditData({ ...editData, max: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Distribution</Label>
                <Select
                  value={editData.distribution}
                  onValueChange={(value: Distribution) => setEditData({ ...editData, distribution: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uniform">Uniform</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="lognormal">Log-normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Confidence</Label>
                <Select
                  value={editData.confidence}
                  onValueChange={(value: Confidence) => setEditData({ ...editData, confidence: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={editData.unit}
                onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                placeholder="e.g., people, dollars, kg"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const AssumptionNode = memo(AssumptionNodeComponent);
