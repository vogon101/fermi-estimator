import type { Node, Edge } from '@xyflow/react';

export type Distribution = 'uniform' | 'normal' | 'lognormal';
export type Confidence = 'low' | 'medium' | 'high';
export type OperationType = 'multiply' | 'divide' | 'add' | 'subtract';

// Base assumption data
export interface AssumptionData {
  name: string;
  description?: string;
  min: number;
  max: number;
  distribution: Distribution;
  unit?: string;
  source?: string;
  confidence?: Confidence;
}

// Node data types for React Flow (with index signature for compatibility)
export interface AssumptionNodeData extends AssumptionData {
  label: string;
  [key: string]: unknown;
}

export interface OperationNodeData {
  label: string;
  operation: OperationType;
  [key: string]: unknown;
}

export interface ResultNodeData {
  label: string;
  value?: number;
  simulationResult?: SimulationResult;
  [key: string]: unknown;
}

// Type-safe node types
export type AssumptionNode = Node<AssumptionNodeData, 'assumption'>;
export type OperationNode = Node<OperationNodeData, 'operation'>;
export type ResultNode = Node<ResultNodeData, 'result'>;
export type EstimateNode = AssumptionNode | OperationNode | ResultNode;

// Graph-based estimate
export interface GraphEstimate {
  id: string;
  name: string;
  question: string;
  nodes: EstimateNode[];
  edges: Edge[];
  createdAt: Date;
  updatedAt: Date;
}

// Legacy types for backward compatibility
export interface Assumption extends AssumptionData {
  id: string;
}

export interface Calculation {
  id: string;
  name: string;
  formula: string;
  assumptions: string[];
}

export interface Estimate {
  id: string;
  name: string;
  question: string;
  assumptions: Assumption[];
  calculation: Calculation;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimulationResult {
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface GeneratedEstimate {
  question: string;
  assumptions: Omit<Assumption, 'id'>[];
  formula: string;
}

export interface EnrichedAssumption {
  min: number;
  max: number;
  source: string;
  confidence: Confidence;
  reasoning: string;
}
