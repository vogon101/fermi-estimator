'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useGraphStore } from '@/lib/graph-store';
import { runGraphSimulation, formatNumber } from '@/lib/monte-carlo';
import { AssumptionNode } from './AssumptionNode';
import { OperationNode } from './OperationNode';
import { ResultNode } from './ResultNode';
import { ConstantNode } from './ConstantNode';
import { FunctionNode } from './FunctionNode';
import { ConditionalNode } from './ConditionalNode';
import { ClampNode } from './ClampNode';
import type { OperationType, FunctionType, ComparisonType, EstimateNode } from '@/lib/types';

const nodeTypes: NodeTypes = {
  assumption: AssumptionNode,
  operation: OperationNode,
  result: ResultNode,
  constant: ConstantNode,
  function: FunctionNode,
  conditional: ConditionalNode,
  clamp: ClampNode,
};

export function GraphEditor() {
  const {
    currentGraph,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addAssumptionNode,
    addOperationNode,
    addResultNode,
    addConstantNode,
    addFunctionNode,
    addConditionalNode,
    addClampNode,
    updateResultNode,
    setNodeSimulationResults,
    saveVersion,
    removeNode,
    removeEdge,
    simulationResult,
    layoutGraph,
  } = useGraphStore();

  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);

  const nodes = useMemo(() => currentGraph?.nodes ?? [], [currentGraph?.nodes]);
  const edges = useMemo(() => currentGraph?.edges ?? [], [currentGraph?.edges]);

  // Handle selection changes
  const onSelectionChange = useCallback(({ nodes, edges }: { nodes: EstimateNode[]; edges: { id: string }[] }) => {
    setSelectedNodes(nodes.map(n => n.id));
    setSelectedEdges(edges.map(e => e.id));
  }, []);

  // Handle delete key press
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Don't delete if we're in an input field
      if ((event.target as HTMLElement).tagName === 'INPUT' ||
          (event.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Delete selected edges first
      selectedEdges.forEach(edgeId => {
        removeEdge(edgeId);
      });

      // Then delete selected nodes
      selectedNodes.forEach(nodeId => {
        removeNode(nodeId);
      });

      setSelectedNodes([]);
      setSelectedEdges([]);
    }
  }, [selectedNodes, selectedEdges, removeNode, removeEdge]);

  // Manual delete button handler
  const handleDeleteSelected = useCallback(() => {
    selectedEdges.forEach(edgeId => {
      removeEdge(edgeId);
    });
    selectedNodes.forEach(nodeId => {
      removeNode(nodeId);
    });
    setSelectedNodes([]);
    setSelectedEdges([]);
  }, [selectedNodes, selectedEdges, removeNode, removeEdge]);

  const assumptionCount = useMemo(
    () => nodes.filter((n) => n.type === 'assumption').length,
    [nodes]
  );

  const hasResultNode = useMemo(
    () => nodes.some((n) => n.type === 'result'),
    [nodes]
  );

  const handleAddAssumption = useCallback(() => {
    addAssumptionNode({
      name: `assumption_${assumptionCount + 1}`,
      min: 0,
      max: 100,
      distribution: 'uniform',
    });
  }, [addAssumptionNode, assumptionCount]);

  const handleAddOperation = useCallback(
    (operation: OperationType) => {
      addOperationNode(operation);
    },
    [addOperationNode]
  );

  const handleAddResult = useCallback(() => {
    if (hasResultNode) return;
    addResultNode();
  }, [addResultNode, hasResultNode]);

  const handleAddConstant = useCallback(() => {
    addConstantNode({ label: 'Constant', value: 1 });
  }, [addConstantNode]);

  const handleAddFunction = useCallback(
    (func: FunctionType) => {
      addFunctionNode(func);
    },
    [addFunctionNode]
  );

  const handleAddConditional = useCallback(
    (comparison: ComparisonType) => {
      addConditionalNode(comparison);
    },
    [addConditionalNode]
  );

  const handleAddClamp = useCallback(() => {
    addClampNode();
  }, [addClampNode]);

  const handleRunSimulation = useCallback(() => {
    if (!currentGraph) return;

    // Use graph-aware simulation that tracks intermediate values
    const { finalResult, nodeResults } = runGraphSimulation(currentGraph, 10000);

    // Store results
    updateResultNode(finalResult);
    setNodeSimulationResults(nodeResults);

    // Save version after manual simulation
    saveVersion('Manual simulation');
  }, [currentGraph, updateResultNode, setNodeSimulationResults, saveVersion]);

  const hasSelection = selectedNodes.length > 0 || selectedEdges.length > 0;

  return (
    <div className="w-full h-full" onKeyDown={handleKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        selectNodesOnDrag={false}
        selectionOnDrag
        deleteKeyCode={null}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { strokeWidth: 2 },
        }}
        edgesReconnectable
      >
        <Background gap={15} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'assumption':
                return '#3b82f6'; // blue
              case 'constant':
                return '#64748b'; // slate
              case 'operation':
                return '#f59e0b'; // amber
              case 'function':
                return '#a855f7'; // purple
              case 'conditional':
                return '#6366f1'; // indigo
              case 'clamp':
                return '#eab308'; // yellow
              case 'result':
                return '#10b981'; // emerald
              default:
                return '#6b7280';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        <Panel position="top-left" className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary">
                + Add Node
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[400px] overflow-y-auto">
              <DropdownMenuItem onClick={handleAddAssumption}>
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                Assumption
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddConstant}>
                <span className="w-3 h-3 rounded-full bg-slate-500 mr-2" />
                Constant
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAddOperation('multiply')}>
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                Multiply (×)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddOperation('divide')}>
                <span className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
                Divide (÷)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddOperation('add')}>
                <span className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                Add (+)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddOperation('subtract')}>
                <span className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                Subtract (−)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddOperation('sum')}>
                <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                Sum (Σ) - Multi-input
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddOperation('product')}>
                <span className="w-3 h-3 rounded-full bg-violet-500 mr-2" />
                Product (∏) - Multi-input
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAddFunction('sqrt')}>
                <span className="w-3 h-3 rounded-full bg-purple-500 mr-2" />
                √x - Square Root
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddFunction('square')}>
                <span className="w-3 h-3 rounded-full bg-purple-500 mr-2" />
                x² - Square
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddFunction('pow')}>
                <span className="w-3 h-3 rounded-full bg-purple-500 mr-2" />
                xⁿ - Power
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddFunction('log')}>
                <span className="w-3 h-3 rounded-full bg-purple-500 mr-2" />
                ln(x) - Natural Log
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddFunction('exp')}>
                <span className="w-3 h-3 rounded-full bg-purple-500 mr-2" />
                eˣ - Exponential
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddFunction('abs')}>
                <span className="w-3 h-3 rounded-full bg-teal-500 mr-2" />
                |x| - Absolute Value
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddFunction('min')}>
                <span className="w-3 h-3 rounded-full bg-cyan-500 mr-2" />
                min(a,b) - Minimum
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddFunction('max')}>
                <span className="w-3 h-3 rounded-full bg-cyan-500 mr-2" />
                max(a,b) - Maximum
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddFunction('custom')}>
                <span className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                f(x) - Custom Expression
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAddConditional('gt')}>
                <span className="w-3 h-3 rounded-full bg-indigo-500 mr-2" />
                If-Then-Else (Conditional)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddClamp}>
                <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                Clamp (Bounds)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleAddResult} disabled={hasResultNode}>
                <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                Result
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={handleRunSimulation}
            disabled={!hasResultNode || nodes.length < 2}
          >
            Run Simulation
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={layoutGraph}
            disabled={nodes.length < 2}
          >
            Auto Layout
          </Button>

          {hasSelection && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteSelected}
            >
              Delete ({selectedNodes.length + selectedEdges.length})
            </Button>
          )}
        </Panel>

        {hasSelection && (
          <Panel position="bottom-left" className="bg-card border rounded-lg p-2 text-xs text-muted-foreground">
            Press Delete or Backspace to remove selected items
          </Panel>
        )}

        {simulationResult && (
          <Panel position="bottom-right" className="bg-card border rounded-lg p-3 text-sm">
            <div className="font-medium mb-1">Last Simulation</div>
            <div className="text-muted-foreground">
              Median: {formatNumber(simulationResult.percentiles.p50)}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
