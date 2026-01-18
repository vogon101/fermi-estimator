'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useEstimateStore } from '@/lib/store';
import { runSimulation, formatNumber } from '@/lib/monte-carlo';
import { DistributionChart } from '@/components/charts/DistributionChart';

export function ResultsPanel() {
  const { currentEstimate, simulationResult, setSimulationResult } =
    useEstimateStore();
  const [iterations, setIterations] = useState(10000);
  const [isRunning, setIsRunning] = useState(false);

  const assumptions = currentEstimate?.assumptions || [];
  const formula = currentEstimate?.calculation?.formula || '';

  const canRun = assumptions.length > 0 && formula.length > 0;

  const handleRunSimulation = () => {
    if (!canRun) return;

    setIsRunning(true);

    // Use setTimeout to allow UI to update before running
    setTimeout(() => {
      try {
        const result = runSimulation(assumptions, formula, iterations);
        setSimulationResult(result);
      } catch (error) {
        console.error('Simulation error:', error);
      } finally {
        setIsRunning(false);
      }
    }, 10);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Results
        </h2>
      </div>

      <div className="flex-1 space-y-4">
        {simulationResult ? (
          <>
            <div className="h-48">
              <DistributionChart
                samples={simulationResult.samples}
                percentiles={simulationResult.percentiles}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted p-3 rounded-lg">
                <Label className="text-xs text-muted-foreground">P5</Label>
                <p className="text-lg font-semibold">
                  {formatNumber(simulationResult.percentiles.p5)}
                </p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <Label className="text-xs text-muted-foreground">P95</Label>
                <p className="text-lg font-semibold">
                  {formatNumber(simulationResult.percentiles.p95)}
                </p>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg col-span-2">
                <Label className="text-xs text-muted-foreground">
                  Median (P50)
                </Label>
                <p className="text-2xl font-bold">
                  {formatNumber(simulationResult.percentiles.p50)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Mean</Label>
                <p className="font-medium">
                  {formatNumber(simulationResult.mean)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Std Dev</Label>
                <p className="font-medium">
                  {formatNumber(simulationResult.stdDev)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">P25</Label>
                <p className="font-medium">
                  {formatNumber(simulationResult.percentiles.p25)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">P75</Label>
                <p className="font-medium">
                  {formatNumber(simulationResult.percentiles.p75)}
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Based on {simulationResult.samples.length.toLocaleString()} simulations
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground text-center py-12">
            {canRun ? (
              <p>Click &quot;Run Simulation&quot; to see results</p>
            ) : (
              <p>
                Add assumptions and a formula
                <br />
                to run the simulation
              </p>
            )}
          </div>
        )}
      </div>

      <div className="pt-3 border-t space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            Iterations:
          </Label>
          <Input
            type="number"
            value={iterations}
            onChange={(e) => setIterations(parseInt(e.target.value) || 1000)}
            className="h-8 w-24 text-sm"
            min={100}
            max={100000}
            step={1000}
          />
        </div>
        <Button
          onClick={handleRunSimulation}
          disabled={!canRun || isRunning}
          className="w-full"
        >
          {isRunning ? 'Running...' : `Run ${iterations.toLocaleString()} Simulations`}
        </Button>
      </div>
    </div>
  );
}
