'use client';

import { useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useEstimateStore } from '@/lib/store';
import { evaluateFormula } from '@/lib/monte-carlo';

const EMPTY_ASSUMPTIONS: never[] = [];

export function CalculationEditor() {
  const { currentEstimate, updateFormula } = useEstimateStore();

  const formula = currentEstimate?.calculation?.formula || '';
  const assumptions = currentEstimate?.assumptions ?? EMPTY_ASSUMPTIONS;

  // Check which assumptions are used in the formula
  const usedAssumptions = useMemo(() => {
    return assumptions.filter((a) => formula.includes(a.name));
  }, [assumptions, formula]);

  const unusedAssumptions = useMemo(() => {
    return assumptions.filter((a) => !formula.includes(a.name));
  }, [assumptions, formula]);

  // Calculate a sample result using midpoint values
  const sampleResult = useMemo(() => {
    if (!formula || assumptions.length === 0) return null;

    const midpointValues: Record<string, number> = {};
    for (const a of assumptions) {
      midpointValues[a.name] = (a.min + a.max) / 2;
    }

    const result = evaluateFormula(formula, midpointValues);
    return isNaN(result) ? null : result;
  }, [formula, assumptions]);

  // Validate formula syntax
  const formulaError = useMemo(() => {
    if (!formula) return null;

    try {
      const testValues: Record<string, number> = {};
      for (const a of assumptions) {
        testValues[a.name] = 1;
      }
      const result = evaluateFormula(formula, testValues);
      if (isNaN(result)) {
        return 'Invalid formula - check syntax';
      }
      return null;
    } catch {
      return 'Invalid formula syntax';
    }
  }, [formula, assumptions]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Calculation
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Formula</Label>
          <Textarea
            value={formula}
            onChange={(e) => updateFormula(e.target.value)}
            placeholder="e.g., population * pianosPerHousehold * tuningsPerYear / tuningsPerTuner"
            className="font-mono text-sm mt-1 min-h-[100px]"
          />
          {formulaError && (
            <p className="text-xs text-destructive mt-1">{formulaError}</p>
          )}
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            Available Variables
          </Label>
          <div className="flex flex-wrap gap-1">
            {assumptions.map((a) => (
              <Badge
                key={a.id}
                variant={usedAssumptions.includes(a) ? 'default' : 'outline'}
                className="text-xs cursor-pointer"
                onClick={() => {
                  const newFormula = formula ? `${formula} * ${a.name}` : a.name;
                  updateFormula(newFormula);
                }}
              >
                {a.name}
              </Badge>
            ))}
            {assumptions.length === 0 && (
              <span className="text-xs text-muted-foreground">
                Add assumptions first
              </span>
            )}
          </div>
        </div>

        {unusedAssumptions.length > 0 && (
          <div className="text-xs text-yellow-600 dark:text-yellow-400">
            Unused assumptions: {unusedAssumptions.map((a) => a.name).join(', ')}
          </div>
        )}

        {sampleResult !== null && (
          <div className="bg-muted p-3 rounded-lg">
            <Label className="text-xs text-muted-foreground">
              Sample Result (using midpoint values)
            </Label>
            <p className="text-2xl font-bold mt-1">
              {sampleResult.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Supported operators:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>
              <code>+</code> addition
            </li>
            <li>
              <code>-</code> subtraction
            </li>
            <li>
              <code>*</code> multiplication
            </li>
            <li>
              <code>/</code> division
            </li>
            <li>
              <code>( )</code> parentheses for grouping
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
