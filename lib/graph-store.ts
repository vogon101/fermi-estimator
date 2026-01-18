import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
} from '@xyflow/react';
import type {
  EstimateNode,
  GraphEstimate,
  GraphVersion,
  SimulationResult,
  ChatMessage,
  AssumptionNodeData,
  OperationNodeData,
  ResultNodeData,
  ConstantNodeData,
  FunctionNodeData,
  ConditionalNodeData,
  ClampNodeData,
  OperationType,
  FunctionType,
  ComparisonType,
} from './types';
import type { NodeSimulationResult } from './monte-carlo';

interface GraphState {
  // Current graph
  currentGraph: GraphEstimate | null;
  simulationResult: SimulationResult | null;
  nodeSimulationResults: Map<string, NodeSimulationResult>;

  // Saved graphs
  savedGraphs: GraphEstimate[];

  // Version history
  versions: GraphVersion[];

  // Chat messages
  chatMessages: ChatMessage[];

  // React Flow state
  onNodesChange: (changes: NodeChange<EstimateNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Actions - Graph
  createNewGraph: (question?: string) => void;
  updateQuestion: (question: string) => void;
  updateGraphName: (name: string) => void;

  // Actions - Nodes
  addAssumptionNode: (data: Omit<AssumptionNodeData, 'label'> & { label?: string }, position?: { x: number; y: number }) => string;
  addOperationNode: (operation: OperationType, position?: { x: number; y: number }, label?: string) => string;
  addResultNode: (position?: { x: number; y: number }) => string;
  addConstantNode: (data: { label: string; value: number; unit?: string; description?: string }, position?: { x: number; y: number }) => string;
  addFunctionNode: (func: FunctionType, position?: { x: number; y: number }, label?: string, parameter?: number | string) => string;
  addConditionalNode: (comparison: ComparisonType, position?: { x: number; y: number }, label?: string) => string;
  addClampNode: (position?: { x: number; y: number }, label?: string, min?: number, max?: number) => string;
  updateNode: (id: string, data: Partial<AssumptionNodeData | OperationNodeData | ResultNodeData | ConstantNodeData | FunctionNodeData | ConditionalNodeData | ClampNodeData>) => void;
  removeNode: (id: string) => void;

  // Actions - Edges
  connectNodes: (sourceId: string, targetId: string, targetHandle?: string) => void;
  removeEdge: (id: string) => void;

  // Actions - Simulation
  setSimulationResult: (result: SimulationResult | null) => void;
  setNodeSimulationResults: (results: Map<string, NodeSimulationResult>) => void;
  updateResultNode: (result: SimulationResult) => void;

  // Actions - Save/Load
  saveCurrentGraph: () => void;
  loadGraph: (id: string) => void;
  deleteGraph: (id: string) => void;

  // Actions - Chat
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;

  // Actions - Bulk
  setGraph: (nodes: EstimateNode[], edges: Edge[]) => void;

  // Actions - Layout
  layoutGraph: () => void;

  // Actions - Version History
  saveVersion: (description: string) => void;
  restoreVersion: (versionId: string) => void;
  clearVersions: () => void;
}

const createEmptyGraph = (question: string = ''): GraphEstimate => ({
  id: uuidv4(),
  name: 'New Estimate',
  question,
  nodes: [],
  edges: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Auto-layout helper
let nodeCounter = 0;
const getNextPosition = () => {
  const col = nodeCounter % 3;
  const row = Math.floor(nodeCounter / 3);
  nodeCounter++;
  return { x: 50 + col * 250, y: 50 + row * 180 };
};

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      currentGraph: createEmptyGraph(),
      simulationResult: null,
      nodeSimulationResults: new Map(),
      savedGraphs: [],
      versions: [],
      chatMessages: [],

      onNodesChange: (changes) => {
        const { currentGraph } = get();
        if (currentGraph) {
          set({
            currentGraph: {
              ...currentGraph,
              nodes: applyNodeChanges(changes, currentGraph.nodes) as EstimateNode[],
              updatedAt: new Date(),
            },
          });
        }
      },

      onEdgesChange: (changes) => {
        const { currentGraph } = get();
        if (currentGraph) {
          set({
            currentGraph: {
              ...currentGraph,
              edges: applyEdgeChanges(changes, currentGraph.edges),
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },

      onConnect: (connection) => {
        const { currentGraph } = get();
        if (currentGraph) {
          set({
            currentGraph: {
              ...currentGraph,
              edges: addEdge({ ...connection, id: uuidv4() }, currentGraph.edges),
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },

      createNewGraph: (question = '') => {
        nodeCounter = 0;
        set({
          currentGraph: createEmptyGraph(question),
          simulationResult: null,
          chatMessages: [],
        });
      },

      updateQuestion: (question) => {
        const { currentGraph } = get();
        if (currentGraph) {
          set({
            currentGraph: {
              ...currentGraph,
              question,
              updatedAt: new Date(),
            },
          });
        }
      },

      updateGraphName: (name) => {
        const { currentGraph } = get();
        if (currentGraph) {
          set({
            currentGraph: {
              ...currentGraph,
              name,
              updatedAt: new Date(),
            },
          });
        }
      },

      addAssumptionNode: (data, position) => {
        const { currentGraph } = get();
        if (!currentGraph) return '';

        const id = uuidv4();
        const pos = position || getNextPosition();

        const newNode: EstimateNode = {
          id,
          type: 'assumption',
          position: pos,
          data: {
            ...data,
            label: data.label || data.name,
          } as AssumptionNodeData,
        };

        set({
          currentGraph: {
            ...currentGraph,
            nodes: [...currentGraph.nodes, newNode],
            updatedAt: new Date(),
          },
          simulationResult: null,
        });

        return id;
      },

      addOperationNode: (operation, position, label) => {
        const { currentGraph } = get();
        if (!currentGraph) return '';

        const id = uuidv4();
        const pos = position || getNextPosition();

        const newNode: EstimateNode = {
          id,
          type: 'operation',
          position: pos,
          data: {
            label: label || operation,
            operation,
          } as OperationNodeData,
        };

        set({
          currentGraph: {
            ...currentGraph,
            nodes: [...currentGraph.nodes, newNode],
            updatedAt: new Date(),
          },
          simulationResult: null,
        });

        return id;
      },

      addResultNode: (position) => {
        const { currentGraph } = get();
        if (!currentGraph) return '';

        const id = uuidv4();
        const pos = position || getNextPosition();

        const newNode: EstimateNode = {
          id,
          type: 'result',
          position: pos,
          data: {
            label: 'Result',
          } as ResultNodeData,
        };

        set({
          currentGraph: {
            ...currentGraph,
            nodes: [...currentGraph.nodes, newNode],
            updatedAt: new Date(),
          },
        });

        return id;
      },

      addConstantNode: (data, position) => {
        const { currentGraph } = get();
        if (!currentGraph) return '';

        const id = uuidv4();
        const pos = position || getNextPosition();

        const newNode: EstimateNode = {
          id,
          type: 'constant',
          position: pos,
          data: {
            label: data.label,
            value: data.value,
            unit: data.unit,
            description: data.description,
          } as ConstantNodeData,
        };

        set({
          currentGraph: {
            ...currentGraph,
            nodes: [...currentGraph.nodes, newNode],
            updatedAt: new Date(),
          },
          simulationResult: null,
        });

        return id;
      },

      addFunctionNode: (func, position, label, parameter) => {
        const { currentGraph } = get();
        if (!currentGraph) return '';

        const id = uuidv4();
        const pos = position || getNextPosition();

        const newNode: EstimateNode = {
          id,
          type: 'function',
          position: pos,
          data: {
            label: label || func,
            function: func,
            parameter,
          } as FunctionNodeData,
        };

        set({
          currentGraph: {
            ...currentGraph,
            nodes: [...currentGraph.nodes, newNode],
            updatedAt: new Date(),
          },
          simulationResult: null,
        });

        return id;
      },

      addConditionalNode: (comparison, position, label) => {
        const { currentGraph } = get();
        if (!currentGraph) return '';

        const id = uuidv4();
        const pos = position || getNextPosition();

        const newNode: EstimateNode = {
          id,
          type: 'conditional',
          position: pos,
          data: {
            label: label || 'Conditional',
            comparison,
          } as ConditionalNodeData,
        };

        set({
          currentGraph: {
            ...currentGraph,
            nodes: [...currentGraph.nodes, newNode],
            updatedAt: new Date(),
          },
          simulationResult: null,
        });

        return id;
      },

      addClampNode: (position, label, min, max) => {
        const { currentGraph } = get();
        if (!currentGraph) return '';

        const id = uuidv4();
        const pos = position || getNextPosition();

        const newNode: EstimateNode = {
          id,
          type: 'clamp',
          position: pos,
          data: {
            label: label || 'Clamp',
            min,
            max,
          } as ClampNodeData,
        };

        set({
          currentGraph: {
            ...currentGraph,
            nodes: [...currentGraph.nodes, newNode],
            updatedAt: new Date(),
          },
          simulationResult: null,
        });

        return id;
      },

      updateNode: (id, data) => {
        const { currentGraph } = get();
        if (currentGraph) {
          set({
            currentGraph: {
              ...currentGraph,
              nodes: currentGraph.nodes.map((node) =>
                node.id === id
                  ? { ...node, data: { ...node.data, ...data } }
                  : node
              ) as EstimateNode[],
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },

      removeNode: (id) => {
        const { currentGraph } = get();
        if (currentGraph) {
          set({
            currentGraph: {
              ...currentGraph,
              nodes: currentGraph.nodes.filter((node) => node.id !== id),
              edges: currentGraph.edges.filter(
                (edge) => edge.source !== id && edge.target !== id
              ),
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },

      connectNodes: (sourceId, targetId, targetHandle) => {
        const { currentGraph } = get();
        if (currentGraph) {
          const newEdge: Edge = {
            id: uuidv4(),
            source: sourceId,
            target: targetId,
            targetHandle,
          };

          set({
            currentGraph: {
              ...currentGraph,
              edges: [...currentGraph.edges, newEdge],
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },

      removeEdge: (id) => {
        const { currentGraph } = get();
        if (currentGraph) {
          set({
            currentGraph: {
              ...currentGraph,
              edges: currentGraph.edges.filter((edge) => edge.id !== id),
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },

      setSimulationResult: (result) => {
        set({ simulationResult: result });
      },

      setNodeSimulationResults: (results) => {
        set({ nodeSimulationResults: results });
      },

      updateResultNode: (result) => {
        const { currentGraph } = get();
        if (currentGraph) {
          set({
            currentGraph: {
              ...currentGraph,
              nodes: currentGraph.nodes.map((node) =>
                node.type === 'result'
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        simulationResult: result,
                        value: result.percentiles.p50,
                      },
                    }
                  : node
              ) as EstimateNode[],
            },
            simulationResult: result,
          });
        }
      },

      saveCurrentGraph: () => {
        const { currentGraph, savedGraphs, chatMessages } = get();
        if (currentGraph) {
          // Include chat history in the saved graph
          const graphWithChat = {
            ...currentGraph,
            chatHistory: chatMessages,
          };
          const existingIndex = savedGraphs.findIndex(
            (g) => g.id === currentGraph.id
          );
          if (existingIndex >= 0) {
            const updated = [...savedGraphs];
            updated[existingIndex] = graphWithChat;
            set({ savedGraphs: updated });
          } else {
            set({ savedGraphs: [...savedGraphs, graphWithChat] });
          }
        }
      },

      loadGraph: (id) => {
        const { savedGraphs } = get();
        const graph = savedGraphs.find((g) => g.id === id);
        if (graph) {
          nodeCounter = graph.nodes.length;
          set({
            currentGraph: { ...graph },
            simulationResult: null,
            // Restore chat history from saved graph, or empty if none
            chatMessages: graph.chatHistory || [],
          });
        }
      },

      deleteGraph: (id) => {
        const { savedGraphs } = get();
        set({
          savedGraphs: savedGraphs.filter((g) => g.id !== id),
        });
      },

      addChatMessage: (message) => {
        const { chatMessages } = get();
        set({
          chatMessages: [
            ...chatMessages,
            {
              ...message,
              id: uuidv4(),
              timestamp: new Date(),
            },
          ],
        });
      },

      clearChat: () => {
        set({ chatMessages: [] });
      },

      setGraph: (nodes, edges) => {
        const { currentGraph } = get();
        if (currentGraph) {
          nodeCounter = nodes.length;
          set({
            currentGraph: {
              ...currentGraph,
              nodes,
              edges,
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },

      layoutGraph: () => {
        const { currentGraph } = get();
        if (!currentGraph || currentGraph.nodes.length === 0) return;

        // Layout constants
        const ASSUMPTION_WIDTH = 220;
        const ASSUMPTION_HEIGHT = 180;
        const CONSTANT_HEIGHT = 120;
        const OPERATION_SIZE = 100;
        const FUNCTION_SIZE = 100;
        const CONDITIONAL_SIZE = 120;
        const CLAMP_SIZE = 100;
        const RESULT_HEIGHT = 150;
        const HORIZONTAL_GAP = 80;
        const VERTICAL_GAP = 30;
        const START_X = 50;
        const START_Y = 50;

        const nodes = currentGraph.nodes;
        const edges = currentGraph.edges;

        // Separate nodes by type
        const assumptions = nodes.filter((n) => n.type === 'assumption');
        const constants = nodes.filter((n) => n.type === 'constant');
        const sourceNodes = [...assumptions, ...constants]; // Nodes that are sources (level 0)
        const intermediateNodes = nodes.filter((n) =>
          n.type === 'operation' || n.type === 'function' || n.type === 'conditional' || n.type === 'clamp'
        );
        const resultNode = nodes.find((n) => n.type === 'result');

        // Calculate node levels using topological sort
        const nodeLevel = new Map<string, number>();

        // All source nodes (assumptions and constants) are level 0
        for (const src of sourceNodes) {
          nodeLevel.set(src.id, 0);
        }

        // Calculate intermediate node levels based on their inputs
        let changed = true;
        while (changed) {
          changed = false;
          for (const node of intermediateNodes) {
            const incomingEdges = edges.filter((e) => e.target === node.id);
            let maxInputLevel = 0;
            for (const edge of incomingEdges) {
              const inputLevel = nodeLevel.get(edge.source) ?? 0;
              maxInputLevel = Math.max(maxInputLevel, inputLevel);
            }
            const newLevel = maxInputLevel + 1;
            const currentLevel = nodeLevel.get(node.id) ?? 0;
            if (newLevel > currentLevel) {
              nodeLevel.set(node.id, newLevel);
              changed = true;
            }
          }
        }

        const maxLevel = Math.max(...Array.from(nodeLevel.values()), 0);

        // Store computed positions - we need to compute in dependency order
        const nodePositions = new Map<string, { x: number; y: number }>();

        // First, position source nodes (assumptions and constants) vertically on the left
        sourceNodes.forEach((node, idx) => {
          const height = node.type === 'assumption' ? ASSUMPTION_HEIGHT : CONSTANT_HEIGHT;
          nodePositions.set(node.id, {
            x: START_X,
            y: START_Y + idx * (Math.max(ASSUMPTION_HEIGHT, CONSTANT_HEIGHT) + VERTICAL_GAP),
          });
        });

        // Get node height based on type
        const getNodeHeight = (node: EstimateNode): number => {
          switch (node.type) {
            case 'assumption': return ASSUMPTION_HEIGHT;
            case 'constant': return CONSTANT_HEIGHT;
            case 'operation': return OPERATION_SIZE;
            case 'function': return FUNCTION_SIZE;
            case 'conditional': return CONDITIONAL_SIZE;
            case 'clamp': return CLAMP_SIZE;
            case 'result': return RESULT_HEIGHT;
            default: return OPERATION_SIZE;
          }
        };

        // Get center Y of a node (accounting for different node heights)
        const getNodeCenterY = (nodeId: string): number => {
          const pos = nodePositions.get(nodeId);
          if (!pos) return START_Y;
          const node = nodes.find((n) => n.id === nodeId);
          if (!node) return pos.y;
          return pos.y + getNodeHeight(node) / 2;
        };

        // Process intermediate nodes level by level (bracket structure)
        // Each node is positioned at the average Y of its inputs
        for (let level = 1; level <= maxLevel; level++) {
          const nodesAtLevel = intermediateNodes.filter((n) => nodeLevel.get(n.id) === level);

          for (const node of nodesAtLevel) {
            const incomingEdges = edges.filter((e) => e.target === node.id);
            const nodeHeight = getNodeHeight(node);

            // Calculate average Y position of inputs (center of the bracket)
            let avgY = START_Y;
            if (incomingEdges.length > 0) {
              const inputCenterYs = incomingEdges.map((e) => getNodeCenterY(e.source));
              avgY = inputCenterYs.reduce((a, b) => a + b, 0) / inputCenterYs.length;
              // Adjust to top-left position from center
              avgY -= nodeHeight / 2;
            }

            nodePositions.set(node.id, {
              x: START_X + ASSUMPTION_WIDTH + HORIZONTAL_GAP + (level - 1) * (OPERATION_SIZE + HORIZONTAL_GAP),
              y: avgY,
            });
          }
        }

        // Position result node based on what feeds into it
        if (resultNode) {
          const incomingEdge = edges.find((e) => e.target === resultNode.id);
          let resultY = START_Y;
          if (incomingEdge) {
            resultY = getNodeCenterY(incomingEdge.source) - RESULT_HEIGHT / 2;
          }
          nodePositions.set(resultNode.id, {
            x: START_X + ASSUMPTION_WIDTH + HORIZONTAL_GAP + maxLevel * (OPERATION_SIZE + HORIZONTAL_GAP),
            y: resultY,
          });
        }

        // Apply positions to nodes
        const newNodes = nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (pos) {
            return { ...node, position: pos };
          }
          return node;
        }) as EstimateNode[];

        set({
          currentGraph: {
            ...currentGraph,
            nodes: newNodes,
            updatedAt: new Date(),
          },
        });
      },

      saveVersion: (description) => {
        const { currentGraph, simulationResult, versions } = get();
        if (!currentGraph) return;

        // Deep clone the graph to avoid reference issues
        const graphClone: GraphEstimate = JSON.parse(JSON.stringify({
          ...currentGraph,
          createdAt: currentGraph.createdAt.toISOString(),
          updatedAt: currentGraph.updatedAt.toISOString(),
        }));
        // Convert dates back
        graphClone.createdAt = new Date(graphClone.createdAt);
        graphClone.updatedAt = new Date(graphClone.updatedAt);

        const version: GraphVersion = {
          id: uuidv4(),
          timestamp: new Date(),
          description,
          graph: graphClone,
          simulationResult: simulationResult ? {
            p5: simulationResult.percentiles.p5,
            p50: simulationResult.percentiles.p50,
            p95: simulationResult.percentiles.p95,
          } : undefined,
        };

        // Keep last 50 versions max
        const newVersions = [version, ...versions].slice(0, 50);
        set({ versions: newVersions });
      },

      restoreVersion: (versionId) => {
        const { versions } = get();
        const version = versions.find((v) => v.id === versionId);
        if (!version) return;

        // Deep clone the graph
        const graphClone: GraphEstimate = JSON.parse(JSON.stringify({
          ...version.graph,
          createdAt: version.graph.createdAt,
          updatedAt: new Date().toISOString(),
        }));
        // Convert dates back
        graphClone.createdAt = new Date(graphClone.createdAt);
        graphClone.updatedAt = new Date(graphClone.updatedAt);

        nodeCounter = graphClone.nodes.length;
        set({
          currentGraph: graphClone,
          simulationResult: null,
          nodeSimulationResults: new Map(),
        });
      },

      clearVersions: () => {
        set({ versions: [] });
      },
    }),
    {
      name: 'fermi-graph-storage',
      partialize: (state) => ({
        savedGraphs: state.savedGraphs,
        versions: state.versions,
      }),
    }
  )
);

// Helper to get assumption nodes from the graph
export function getAssumptionNodes(graph: GraphEstimate | null): EstimateNode[] {
  if (!graph) return [];
  return graph.nodes.filter((node) => node.type === 'assumption');
}

// Helper to build a formula from the graph (for simulation)
export function buildFormulaFromGraph(graph: GraphEstimate | null): {
  formula: string;
  assumptions: Map<string, AssumptionNodeData>;
} {
  if (!graph) return { formula: '', assumptions: new Map() };

  const assumptions = new Map<string, AssumptionNodeData>();
  const nodeValues = new Map<string, string>();

  // First pass: collect assumption values
  for (const node of graph.nodes) {
    if (node.type === 'assumption') {
      const data = node.data as AssumptionNodeData;
      assumptions.set(node.id, data);
      nodeValues.set(node.id, data.name.replace(/\s+/g, '_'));
    }
  }

  // Build expression by traversing from result node backward
  const resultNode = graph.nodes.find((n) => n.type === 'result');
  if (!resultNode) return { formula: '', assumptions };

  const getNodeExpression = (nodeId: string): string => {
    if (nodeValues.has(nodeId)) {
      return nodeValues.get(nodeId)!;
    }

    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) return '0';

    if (node.type === 'operation') {
      const data = node.data as OperationNodeData;
      const incomingEdges = graph.edges.filter((e) => e.target === nodeId);

      if (incomingEdges.length < 2) return '0';

      const inputA = getNodeExpression(incomingEdges[0].source);
      const inputB = getNodeExpression(incomingEdges[1].source);

      const ops: Record<string, string> = {
        multiply: '*',
        divide: '/',
        add: '+',
        subtract: '-',
      };

      const expr = `(${inputA} ${ops[data.operation]} ${inputB})`;
      nodeValues.set(nodeId, expr);
      return expr;
    }

    return '0';
  };

  // Get the expression leading to the result node
  const incomingEdge = graph.edges.find((e) => e.target === resultNode.id);
  const formula = incomingEdge ? getNodeExpression(incomingEdge.source) : '';

  return { formula, assumptions };
}
