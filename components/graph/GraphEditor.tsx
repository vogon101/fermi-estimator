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
import { runGraphSimulation } from '@/lib/monte-carlo';
import { AssumptionNode } from './AssumptionNode';
import { OperationNode } from './OperationNode';
import { ResultNode } from './ResultNode';
import type { OperationType, EstimateNode } from '@/lib/types';

const nodeTypes: NodeTypes = {
  assumption: AssumptionNode,
  operation: OperationNode,
  result: ResultNode,
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
    updateResultNode,
    setNodeSimulationResults,
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

  const handleRunSimulation = useCallback(() => {
    if (!currentGraph) return;

    // Use graph-aware simulation that tracks intermediate values
    const { finalResult, nodeResults } = runGraphSimulation(currentGraph, 10000);

    // Store results
    updateResultNode(finalResult);
    setNodeSimulationResults(nodeResults);
  }, [currentGraph, updateResultNode, setNodeSimulationResults]);

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
                return '#3b82f6';
              case 'operation':
                return '#f59e0b';
              case 'result':
                return '#10b981';
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
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleAddAssumption}>
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                Assumption
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
              Median: {simulationResult.percentiles.p50.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
