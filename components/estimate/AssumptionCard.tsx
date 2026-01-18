'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Assumption, Distribution, Confidence } from '@/lib/types';
import { enrichAssumption } from '@/lib/gemini';
import { formatNumber } from '@/lib/monte-carlo';

interface AssumptionCardProps {
  assumption: Assumption;
  onUpdate: (updates: Partial<Assumption>) => void;
  onDelete: () => void;
}

export function AssumptionCard({
  assumption,
  onUpdate,
  onDelete,
}: AssumptionCardProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEnrich = async () => {
    setIsEnriching(true);
    try {
      const enriched = await enrichAssumption(assumption);
      onUpdate({
        min: enriched.min,
        max: enriched.max,
        source: enriched.source,
        confidence: enriched.confidence,
      });
    } catch (error) {
      console.error('Failed to enrich assumption:', error);
    } finally {
      setIsEnriching(false);
    }
  };

  const confidenceColors: Record<Confidence, string> = {
    low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  };

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <Input
              value={assumption.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="h-7 text-sm font-medium border-none p-0 focus-visible:ring-0"
              placeholder="Assumption name"
            />
          </CardTitle>
          <div className="flex items-center gap-1">
            {assumption.confidence && (
              <Badge
                variant="secondary"
                className={`text-xs ${confidenceColors[assumption.confidence]}`}
              >
                {assumption.confidence}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '−' : '+'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Min</Label>
              <Input
                type="number"
                value={assumption.min}
                onChange={(e) => onUpdate({ min: parseFloat(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
            </div>
            <span className="mt-5 text-muted-foreground">–</span>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Max</Label>
              <Input
                type="number"
                value={assumption.max}
                onChange={(e) => onUpdate({ max: parseFloat(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
            </div>
            {assumption.unit && (
              <span className="mt-5 text-sm text-muted-foreground">
                {assumption.unit}
              </span>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Range: {formatNumber(assumption.min)} – {formatNumber(assumption.max)}
          </div>

          {isExpanded && (
            <div className="space-y-2 pt-2 border-t">
              <div>
                <Label className="text-xs text-muted-foreground">Distribution</Label>
                <Select
                  value={assumption.distribution}
                  onValueChange={(value: Distribution) =>
                    onUpdate({ distribution: value })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uniform">Uniform</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="lognormal">Log-normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Unit</Label>
                <Input
                  value={assumption.unit || ''}
                  onChange={(e) => onUpdate({ unit: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="e.g., people, dollars"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input
                  value={assumption.description || ''}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="What this assumption represents"
                />
              </div>

              {assumption.source && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  <strong>Source:</strong> {assumption.source}
                </div>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={handleEnrich}
            disabled={isEnriching}
          >
            {isEnriching ? 'Enriching...' : 'Enrich with AI'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
