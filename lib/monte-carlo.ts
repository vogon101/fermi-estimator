import type { Assumption, SimulationResult, GraphEstimate, OperationType } from './types';

// Intermediate results for each node in the graph
export interface NodeSimulationResult {
  nodeId: string;
  samples: number[];
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  mean: number;
  stdDev: number;
}

// Box-Muller transform for generating normal random numbers
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

// Sample from a uniform distribution
function sampleUniform(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Sample from a normal distribution (truncated to min/max)
function sampleNormal(min: number, max: number): number {
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 4; // ~95% within range
  let value: number;
  let attempts = 0;
  do {
    value = randomNormal(mean, stdDev);
    attempts++;
  } while ((value < min || value > max) && attempts < 100);
  return Math.max(min, Math.min(max, value));
}

// Sample from a lognormal distribution
function sampleLognormal(min: number, max: number): number {
  // Convert min/max to log space
  const logMin = Math.log(Math.max(min, 0.0001));
  const logMax = Math.log(Math.max(max, 0.0001));
  const logMean = (logMin + logMax) / 2;
  const logStdDev = (logMax - logMin) / 4;
  const logValue = randomNormal(logMean, logStdDev);
  const value = Math.exp(logValue);
  return Math.max(min, Math.min(max, value));
}

// Sample a single value from an assumption based on its distribution
export function sampleAssumption(assumption: Assumption): number {
  const { min, max, distribution } = assumption;

  switch (distribution) {
    case 'uniform':
      return sampleUniform(min, max);
    case 'normal':
      return sampleNormal(min, max);
    case 'lognormal':
      return sampleLognormal(min, max);
    default:
      return sampleUniform(min, max);
  }
}

// Parse and evaluate a formula with assumption values
export function evaluateFormula(
  formula: string,
  assumptionValues: Record<string, number>
): number {
  // Replace assumption names with their values
  let expression = formula;

  // Sort by name length (longest first) to avoid partial replacements
  const sortedNames = Object.keys(assumptionValues).sort(
    (a, b) => b.length - a.length
  );

  for (const name of sortedNames) {
    const value = assumptionValues[name];
    // Replace assumption name with its value (as a number)
    const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'g');
    expression = expression.replace(regex, `(${value})`);
  }

  // Evaluate the expression safely
  try {
    // Only allow numbers, basic operators, and parentheses
    const sanitized = expression.replace(/[^0-9+\-*/().e\s]/gi, '');
    const result = new Function(`return ${sanitized}`)();
    if (typeof result !== 'number' || !isFinite(result)) {
      return NaN;
    }
    return result;
  } catch {
    return NaN;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Run Monte Carlo simulation
export function runSimulation(
  assumptions: Assumption[],
  formula: string,
  iterations: number = 10000
): SimulationResult {
  const samples: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Sample each assumption
    const values: Record<string, number> = {};
    for (const assumption of assumptions) {
      values[assumption.name] = sampleAssumption(assumption);
    }

    // Evaluate the formula
    const result = evaluateFormula(formula, values);
    if (!isNaN(result) && isFinite(result)) {
      samples.push(result);
    }
  }

  // Sort samples for percentile calculation
  const sorted = [...samples].sort((a, b) => a - b);

  // Calculate statistics
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance =
    samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    samples.length;
  const stdDev = Math.sqrt(variance);

  // Calculate percentiles
  const getPercentile = (p: number) => {
    const index = Math.floor((p / 100) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)] || 0;
  };

  return {
    samples,
    percentiles: {
      p5: getPercentile(5),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p95: getPercentile(95),
    },
    mean,
    stdDev,
  };
}

// Create histogram data for visualization
export function createHistogramData(
  samples: number[],
  bins: number = 50
): { bin: string; count: number; range: [number, number] }[] {
  if (samples.length === 0) return [];

  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const binWidth = (max - min) / bins;

  const histogram: { bin: string; count: number; range: [number, number] }[] =
    [];

  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = samples.filter((s) => s >= binStart && s < binEnd).length;
    histogram.push({
      bin: formatNumber(binStart),
      count,
      range: [binStart, binEnd],
    });
  }

  return histogram;
}

// Format numbers for display
export function formatNumber(num: number): string {
  if (Math.abs(num) >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  }
  if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  if (Math.abs(num) >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  if (Math.abs(num) < 0.01 && num !== 0) {
    return num.toExponential(2);
  }
  return num.toFixed(2);
}

// Calculate statistics from samples
function calculateStats(samples: number[]): Omit<NodeSimulationResult, 'nodeId'> {
  if (samples.length === 0) {
    return {
      samples: [],
      percentiles: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 },
      mean: 0,
      stdDev: 0,
    };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
  const stdDev = Math.sqrt(variance);

  const getPercentile = (p: number) => {
    const index = Math.floor((p / 100) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)] || 0;
  };

  return {
    samples,
    percentiles: {
      p5: getPercentile(5),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p95: getPercentile(95),
    },
    mean,
    stdDev,
  };
}

// Run simulation on the graph and track intermediate values at each node
export function runGraphSimulation(
  graph: GraphEstimate,
  iterations: number = 10000
): { finalResult: SimulationResult; nodeResults: Map<string, NodeSimulationResult> } {
  const nodeResults = new Map<string, NodeSimulationResult>();
  const nodeSamples = new Map<string, number[]>();

  // Initialize sample arrays for all nodes
  for (const node of graph.nodes) {
    nodeSamples.set(node.id, []);
  }

  // Build adjacency map: for each node, which nodes feed into it?
  const incomingEdges = new Map<string, { sourceId: string; handle?: string }[]>();
  for (const edge of graph.edges) {
    if (!incomingEdges.has(edge.target)) {
      incomingEdges.set(edge.target, []);
    }
    incomingEdges.get(edge.target)!.push({
      sourceId: edge.source,
      handle: edge.targetHandle || undefined,
    });
  }

  // Compute values for a single iteration
  const computeNodeValue = (
    nodeId: string,
    iterationValues: Map<string, number>
  ): number => {
    // If already computed this iteration, return cached value
    if (iterationValues.has(nodeId)) {
      return iterationValues.get(nodeId)!;
    }

    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) return 0;

    let value: number;

    if (node.type === 'assumption') {
      const data = node.data;
      // Sample from the assumption's distribution
      const assumption: Assumption = {
        id: node.id,
        name: data.name,
        min: data.min,
        max: data.max,
        distribution: data.distribution,
      };
      value = sampleAssumption(assumption);
    } else if (node.type === 'operation') {
      const data = node.data;
      const incoming = incomingEdges.get(nodeId) || [];

      // Get the two input values
      let inputA = 0;
      let inputB = 0;

      for (const edge of incoming) {
        const inputValue = computeNodeValue(edge.sourceId, iterationValues);
        if (edge.handle === 'a' || (!edge.handle && incoming.indexOf(edge) === 0)) {
          inputA = inputValue;
        } else {
          inputB = inputValue;
        }
      }

      // Apply the operation
      const operation = data.operation as OperationType;
      switch (operation) {
        case 'multiply':
          value = inputA * inputB;
          break;
        case 'divide':
          value = inputB !== 0 ? inputA / inputB : 0;
          break;
        case 'add':
          value = inputA + inputB;
          break;
        case 'subtract':
          value = inputA - inputB;
          break;
        default:
          value = 0;
      }
    } else if (node.type === 'result') {
      // Result node just passes through its input
      const incoming = incomingEdges.get(nodeId) || [];
      if (incoming.length > 0) {
        value = computeNodeValue(incoming[0].sourceId, iterationValues);
      } else {
        value = 0;
      }
    } else {
      value = 0;
    }

    iterationValues.set(nodeId, value);
    return value;
  };

  // Find the result node
  const resultNode = graph.nodes.find((n) => n.type === 'result');
  if (!resultNode) {
    return {
      finalResult: {
        samples: [],
        percentiles: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 },
        mean: 0,
        stdDev: 0,
      },
      nodeResults,
    };
  }

  // Run iterations
  for (let i = 0; i < iterations; i++) {
    const iterationValues = new Map<string, number>();

    // Compute the result (this recursively computes all needed nodes)
    computeNodeValue(resultNode.id, iterationValues);

    // Store all computed values
    for (const [nodeId, value] of iterationValues) {
      if (isFinite(value) && !isNaN(value)) {
        nodeSamples.get(nodeId)?.push(value);
      }
    }
  }

  // Calculate statistics for each node
  for (const [nodeId, samples] of nodeSamples) {
    if (samples.length > 0) {
      const stats = calculateStats(samples);
      nodeResults.set(nodeId, { nodeId, ...stats });
    }
  }

  // Get final result
  const resultSamples = nodeSamples.get(resultNode.id) || [];
  const finalResult = calculateStats(resultSamples);

  return {
    finalResult: { ...finalResult, samples: resultSamples },
    nodeResults,
  };
}
