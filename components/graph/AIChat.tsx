'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useGraphStore, buildFormulaFromGraph } from '@/lib/graph-store';
import { runSimulation, runGraphSimulation } from '@/lib/monte-carlo';
import type { OperationType, FunctionType, ComparisonType, Distribution, Confidence } from '@/lib/types';

interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
}

interface AIResponse {
  response: string;
  toolCalls: ToolCall[];
  toolResults: { toolName: string; result: unknown }[];
}

export function AIChat() {
  const {
    currentGraph,
    chatMessages,
    addChatMessage,
    clearChat,
    addAssumptionNode,
    addConstantNode,
    addFunctionNode,
    addConditionalNode,
    addClampNode,
    updateNode,
    removeNode,
    addOperationNode,
    addResultNode,
    connectNodes,
    updateResultNode,
    setNodeSimulationResults,
    saveVersion,
    createNewGraph,
    layoutGraph,
    updateGraphName,
  } = useGraphStore();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Process tool calls and apply them to the graph
  const processToolCalls = useCallback(
    (toolCalls: ToolCall[]) => {
      const nodeNameToId = new Map<string, string>();

      // First pass: collect existing node names (use fresh state)
      const graphState = useGraphStore.getState().currentGraph;
      if (graphState) {
        for (const node of graphState.nodes) {
          if (node.type === 'assumption') {
            nodeNameToId.set(node.data.name, node.id);
          } else if (node.type === 'operation') {
            nodeNameToId.set(node.data.label, node.id);
          } else if (node.type === 'result') {
            nodeNameToId.set('Result', node.id);
          }
        }
      }

      for (const tc of toolCalls) {
        switch (tc.toolName) {
          case 'createAssumption': {
            const args = tc.args as {
              name: string;
              description?: string;
              min: number;
              max: number;
              distribution: Distribution;
              unit?: string;
              source?: string;
              confidence?: Confidence;
            };
            const id = addAssumptionNode({
              name: args.name,
              description: args.description,
              min: args.min,
              max: args.max,
              distribution: args.distribution,
              unit: args.unit,
              source: args.source,
              confidence: args.confidence,
            });
            nodeNameToId.set(args.name, id);
            break;
          }

          case 'updateAssumption': {
            const args = tc.args as {
              name: string;
              updates: Partial<{
                newName: string;
                min: number;
                max: number;
                distribution: Distribution;
                description: string;
                source: string;
                confidence: Confidence;
                unit: string;
              }>;
            };
            const nodeId = nodeNameToId.get(args.name);
            if (nodeId) {
              // Handle rename: update the name field and nodeNameToId map
              const updatesToApply: Record<string, unknown> = { ...args.updates };
              if (args.updates.newName) {
                updatesToApply.name = args.updates.newName;
                updatesToApply.label = args.updates.newName;
                nodeNameToId.delete(args.name);
                nodeNameToId.set(args.updates.newName, nodeId);
                delete updatesToApply.newName;
              }
              updateNode(nodeId, updatesToApply);
            }
            break;
          }

          case 'deleteAssumption': {
            const args = tc.args as { name: string };
            const nodeId = nodeNameToId.get(args.name);
            if (nodeId) {
              removeNode(nodeId);
              nodeNameToId.delete(args.name);
            }
            break;
          }

          case 'createOperation': {
            const args = tc.args as { operation: OperationType; label: string };
            const label = args.label || args.operation;
            const id = addOperationNode(args.operation, undefined, label);
            nodeNameToId.set(label, id);
            break;
          }

          case 'updateOperation': {
            const args = tc.args as {
              name: string;
              updates: Partial<{
                newLabel: string;
                operation: OperationType;
              }>;
            };
            const nodeId = nodeNameToId.get(args.name);
            if (nodeId) {
              const updatesToApply: Record<string, unknown> = {};
              if (args.updates.operation) {
                updatesToApply.operation = args.updates.operation;
              }
              if (args.updates.newLabel) {
                updatesToApply.label = args.updates.newLabel;
                nodeNameToId.delete(args.name);
                nodeNameToId.set(args.updates.newLabel, nodeId);
              }
              updateNode(nodeId, updatesToApply);
            }
            break;
          }

          case 'createResult': {
            const args = tc.args as { label?: string };
            const id = addResultNode();
            nodeNameToId.set(args.label || 'Result', id);
            break;
          }

          case 'createConstant': {
            const args = tc.args as {
              label: string;
              value: number;
              unit?: string;
              description?: string;
            };
            const id = addConstantNode({
              label: args.label,
              value: args.value,
              unit: args.unit,
              description: args.description,
            });
            nodeNameToId.set(args.label, id);
            break;
          }

          case 'createFunction': {
            const args = tc.args as {
              function: FunctionType;
              label?: string;
              parameter?: number | string;
            };
            const label = args.label || args.function;
            const id = addFunctionNode(args.function, undefined, label, args.parameter);
            nodeNameToId.set(label, id);
            break;
          }

          case 'createConditional': {
            const args = tc.args as {
              comparison: ComparisonType;
              label?: string;
            };
            const label = args.label || 'Conditional';
            const id = addConditionalNode(args.comparison, undefined, label);
            nodeNameToId.set(label, id);
            break;
          }

          case 'createClamp': {
            const args = tc.args as {
              label?: string;
              min?: number;
              max?: number;
            };
            const label = args.label || 'Clamp';
            const id = addClampNode(undefined, label, args.min, args.max);
            nodeNameToId.set(label, id);
            break;
          }

          case 'connectNodes': {
            const args = tc.args as {
              sourceName: string;
              targetName: string;
              targetHandle?: string;
            };
            const sourceId = nodeNameToId.get(args.sourceName);
            const targetId = nodeNameToId.get(args.targetName);
            if (sourceId && targetId) {
              connectNodes(sourceId, targetId, args.targetHandle);
            }
            break;
          }

          case 'buildEstimate': {
            const args = tc.args as {
              assumptions?: Array<{
                name: string;
                description?: string;
                min: number;
                max: number;
                distribution: Distribution;
                unit?: string;
                source?: string;
                confidence?: Confidence;
              }>;
              operations?: Array<{
                operation: OperationType;
                inputs: [string, string];
                outputName: string;
              }>;
              finalOutput?: string;
            };

            // Ensure we have arrays
            const assumptions = args.assumptions || [];
            const operations = args.operations || [];
            const finalOutput = args.finalOutput || '';

            // Layout constants
            const ASSUMPTION_WIDTH = 220;
            const ASSUMPTION_HEIGHT = 180;
            const OPERATION_SIZE = 100;
            const RESULT_HEIGHT = 150;
            const HORIZONTAL_GAP = 80;
            const VERTICAL_GAP = 30;
            const START_X = 50;
            const START_Y = 50;

            // Calculate operation levels (topological sort)
            const opLevels = new Map<string, number>();
            const nodeLevel = new Map<string, number>();

            // All assumptions are level 0
            for (const assumption of assumptions) {
              nodeLevel.set(assumption.name, 0);
            }

            // Calculate operation levels based on their inputs
            let changed = true;
            while (changed) {
              changed = false;
              for (const op of operations) {
                const input1Level = nodeLevel.get(op.inputs[0]) ?? 0;
                const input2Level = nodeLevel.get(op.inputs[1]) ?? 0;
                const newLevel = Math.max(input1Level, input2Level) + 1;
                const currentLevel = nodeLevel.get(op.outputName) ?? 0;
                if (newLevel > currentLevel) {
                  nodeLevel.set(op.outputName, newLevel);
                  opLevels.set(op.outputName, newLevel);
                  changed = true;
                }
              }
            }

            // Group operations by level
            const opsByLevel = new Map<number, typeof operations>();
            for (const op of operations) {
              const level = opLevels.get(op.outputName) ?? 1;
              if (!opsByLevel.has(level)) {
                opsByLevel.set(level, []);
              }
              opsByLevel.get(level)!.push(op);
            }

            const maxLevel = Math.max(...Array.from(opLevels.values()), 0);

            // Track center Y positions for bracket-style layout
            const nodeCenterY = new Map<string, number>();

            // Create assumption nodes - arranged vertically on the left
            let y = START_Y;
            for (const assumption of assumptions) {
              const id = addAssumptionNode(assumption, { x: START_X, y });
              nodeNameToId.set(assumption.name, id);
              nodeCenterY.set(assumption.name, y + ASSUMPTION_HEIGHT / 2);
              y += ASSUMPTION_HEIGHT + VERTICAL_GAP;
            }

            // Create operation nodes - bracket style (positioned at average Y of inputs)
            const operationStartX = START_X + ASSUMPTION_WIDTH + HORIZONTAL_GAP;

            for (let level = 1; level <= maxLevel; level++) {
              const opsAtLevel = opsByLevel.get(level) || [];
              const levelX = operationStartX + (level - 1) * (OPERATION_SIZE + HORIZONTAL_GAP);

              for (const op of opsAtLevel) {
                // Calculate Y as average of input centers (bracket style)
                const input1CenterY = nodeCenterY.get(op.inputs[0]) ?? START_Y;
                const input2CenterY = nodeCenterY.get(op.inputs[1]) ?? START_Y;
                const avgCenterY = (input1CenterY + input2CenterY) / 2;
                const opY = avgCenterY - OPERATION_SIZE / 2;

                const id = addOperationNode(op.operation, { x: levelX, y: opY }, op.outputName);
                nodeNameToId.set(op.outputName, id);
                nodeCenterY.set(op.outputName, avgCenterY);

                // Connect inputs
                const input1 = nodeNameToId.get(op.inputs[0]);
                const input2 = nodeNameToId.get(op.inputs[1]);
                if (input1) connectNodes(input1, id, 'a');
                if (input2) connectNodes(input2, id, 'b');
              }
            }

            // Create and connect result node - positioned based on what feeds into it
            const resultX = operationStartX + maxLevel * (OPERATION_SIZE + HORIZONTAL_GAP);
            const finalCenterY = nodeCenterY.get(finalOutput) ?? START_Y + RESULT_HEIGHT / 2;
            const resultY = finalCenterY - RESULT_HEIGHT / 2;
            const resultId = addResultNode({ x: resultX, y: Math.max(START_Y, resultY) });
            nodeNameToId.set('Result', resultId);

            if (finalOutput) {
              const finalNodeId = nodeNameToId.get(finalOutput);
              if (finalNodeId) {
                connectNodes(finalNodeId, resultId);
              }
            }

            // Run simulation automatically after building to populate intermediate graphs
            // Use setTimeout to ensure the graph state is updated before running simulation
            setTimeout(() => {
              const latestGraph = useGraphStore.getState().currentGraph;
              if (latestGraph) {
                const { finalResult, nodeResults } = runGraphSimulation(latestGraph, 10000);
                useGraphStore.getState().updateResultNode(finalResult);
                useGraphStore.getState().setNodeSimulationResults(nodeResults);
                // Save version after AI builds estimate
                useGraphStore.getState().saveVersion('AI built estimate');
              }
            }, 100);
            break;
          }

          case 'runSimulation': {
            const args = tc.args as { iterations?: number };
            // Get fresh state from store (currentGraph in closure may be stale)
            const latestGraph = useGraphStore.getState().currentGraph;
            if (latestGraph) {
              // Use graph simulation to track intermediate results
              const { finalResult, nodeResults } = runGraphSimulation(latestGraph, args.iterations || 10000);
              updateResultNode(finalResult);
              setNodeSimulationResults(nodeResults);
              // Save version after simulation
              saveVersion('Ran simulation');
            }
            break;
          }

          case 'clearGraph': {
            // Clear the graph to start fresh
            createNewGraph();
            nodeNameToId.clear();
            break;
          }

          case 'deleteOperation': {
            const args = tc.args as { name: string };
            const nodeId = nodeNameToId.get(args.name);
            if (nodeId) {
              removeNode(nodeId);
              nodeNameToId.delete(args.name);
            }
            break;
          }

          case 'layoutGraph': {
            // Re-layout the graph for better visual organization
            layoutGraph();
            break;
          }

          case 'setProjectTitle': {
            const args = tc.args as { title: string };
            updateGraphName(args.title);
            break;
          }
        }
      }
    },
    [
      addAssumptionNode,
      addConstantNode,
      addFunctionNode,
      addConditionalNode,
      addClampNode,
      updateNode,
      removeNode,
      addOperationNode,
      addResultNode,
      connectNodes,
      updateResultNode,
      setNodeSimulationResults,
      saveVersion,
      createNewGraph,
      layoutGraph,
      updateGraphName,
    ]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    addChatMessage({
      role: 'user',
      content: userMessage,
    });

    setIsLoading(true);

    try {
      // Build a clear summary of the current graph for the AI
      const graphSummary = currentGraph && currentGraph.nodes.length > 0
        ? {
            hasExistingGraph: true,
            assumptions: currentGraph.nodes
              .filter((n) => n.type === 'assumption')
              .map((n) => ({
                name: n.data.name,
                min: n.data.min,
                max: n.data.max,
                distribution: n.data.distribution,
                unit: n.data.unit,
                description: n.data.description,
              })),
            operations: currentGraph.nodes
              .filter((n) => n.type === 'operation')
              .map((n) => ({
                label: n.data.label,
                operation: n.data.operation,
              })),
            hasResultNode: currentGraph.nodes.some((n) => n.type === 'result'),
            edgeCount: currentGraph.edges.length,
          }
        : { hasExistingGraph: false };

      // Send request with current graph state
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: currentGraph?.question,
          graphState: graphSummary,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data: AIResponse = await response.json();

      // Process any tool calls
      if (data.toolCalls && data.toolCalls.length > 0) {
        processToolCalls(data.toolCalls);
      }

      // Add assistant message with tool call info
      addChatMessage({
        role: 'assistant',
        content: data.response || 'I\'ve updated the graph based on your request.',
        toolCalls: data.toolCalls?.map((tc) => ({
          toolName: tc.toolName,
          args: tc.args,
        })),
      });
    } catch (error) {
      addChatMessage({
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    'How many piano tuners are in Chicago?',
    'How much does the Eiffel Tower weigh?',
    'How many golf balls fit in a school bus?',
  ];

  return (
    <>
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-semibold">AI Assistant</h3>
        {chatMessages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => setShowClearConfirm(true)}
          >
            Clear Chat
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
        {chatMessages.length === 0 ? (
          <div className="text-sm text-muted-foreground space-y-3">
            <p>Ask me to build a Fermi estimate:</p>
            <div className="flex flex-col gap-2">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-3 text-xs text-left justify-start"
                  onClick={() => setInput(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={`text-sm ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-8'
                  : 'bg-muted mr-4'
              } p-3 rounded-lg`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                  <p className="text-xs text-muted-foreground">Actions taken:</p>
                  <div className="flex flex-wrap gap-1">
                    {message.toolCalls.map((tc, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tc.toolName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="bg-muted mr-4 p-3 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="text-muted-foreground ml-2">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a Fermi question or refine the estimate..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </Button>
      </form>
    </Card>

    <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>Clear Chat History</DialogTitle>
          <DialogDescription>
            Are you sure you want to clear all {chatMessages.length} messages? This will reset the AI context.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              clearChat();
              setShowClearConfirm(false);
            }}
          >
            Clear All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
