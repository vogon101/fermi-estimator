'use client';

import { memo, useState } from 'react';
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
import type { ConstantNodeData } from '@/lib/types';
import { formatNumber } from '@/lib/monte-carlo';
import { useGraphStore } from '@/lib/graph-store';

type ConstantNodeType = Node<ConstantNodeData, 'constant'>;

function ConstantNodeComponent({ id, data, selected }: NodeProps<ConstantNodeType>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    label: data.label,
    value: data.value,
    unit: data.unit || '',
    description: data.description || '',
  });

  const updateNode = useGraphStore((state) => state.updateNode);

  const handleSave = () => {
    updateNode(id, {
      label: editData.label,
      value: editData.value,
      unit: editData.unit || undefined,
      description: editData.description || undefined,
    });
    setIsEditing(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditData({
      label: data.label,
      value: data.value,
      unit: data.unit || '',
      description: data.description || '',
    });
    setIsEditing(true);
  };

  return (
    <>
      <Card
        className={`p-3 min-w-[120px] cursor-pointer hover:shadow-md transition-shadow ${selected ? 'ring-2 ring-primary' : ''}`}
        onDoubleClick={handleDoubleClick}
      >
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-primary border-2 border-background"
        />

        <div className="flex flex-col items-center gap-2">
          {/* Label */}
          <span className="text-xs font-medium text-foreground truncate max-w-[100px]" title={data.label}>
            {data.label}
          </span>

          {/* Value display */}
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-slate-500 text-white">
            <span className="text-sm font-bold font-mono">
              {formatNumber(data.value)}
            </span>
          </div>

          {/* Unit badge */}
          {data.unit && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              {data.unit}
            </Badge>
          )}

          {data.description && (
            <p className="text-[9px] text-muted-foreground text-center line-clamp-2 max-w-[100px]">
              {data.description}
            </p>
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Edit Constant</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="label">Name</Label>
              <Input
                id="label"
                value={editData.label}
                onChange={(e) => setEditData({ ...editData, label: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                value={editData.value}
                onChange={(e) => setEditData({ ...editData, value: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={editData.unit}
                onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                placeholder="e.g., months/year, pi, etc."
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
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const ConstantNode = memo(ConstantNodeComponent);
