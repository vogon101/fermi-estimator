'use client';

import { useState, useCallback } from 'react';
import { runSimulation } from '@/lib/monte-carlo';
import { useEstimateStore } from '@/lib/store';
import type { SimulationResult } from '@/lib/types';

interface UseSimulationOptions {
  iterations?: number;
}

interface UseSimulationReturn {
  result: SimulationResult | null;
  isRunning: boolean;
  error: string | null;
  run: () => void;
  clear: () => void;
}

export function useSimulation(options: UseSimulationOptions = {}): UseSimulationReturn {
  const { iterations = 10000 } = options;
  const { currentEstimate, setSimulationResult, simulationResult } = useEstimateStore();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    if (!currentEstimate) {
      setError('No estimate loaded');
      return;
    }

    const { assumptions, calculation } = currentEstimate;

    if (assumptions.length === 0) {
      setError('Add at least one assumption');
      return;
    }

    if (!calculation.formula) {
      setError('Enter a formula');
      return;
    }

    setIsRunning(true);
    setError(null);

    // Use setTimeout to allow UI to update before running
    setTimeout(() => {
      try {
        const result = runSimulation(assumptions, calculation.formula, iterations);

        if (result.samples.length === 0) {
          setError('Simulation produced no valid results. Check your formula.');
          setSimulationResult(null);
        } else {
          setSimulationResult(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Simulation failed');
        setSimulationResult(null);
      } finally {
        setIsRunning(false);
      }
    }, 10);
  }, [currentEstimate, iterations, setSimulationResult]);

  const clear = useCallback(() => {
    setSimulationResult(null);
    setError(null);
  }, [setSimulationResult]);

  return {
    result: simulationResult,
    isRunning,
    error,
    run,
    clear,
  };
}
