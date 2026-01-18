'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { GraphEditor } from './GraphEditor';
import { AIChat } from './AIChat';
import { useGraphStore } from '@/lib/graph-store';

export function FermiApp() {
  const {
    currentGraph,
    savedGraphs,
    updateQuestion,
    updateGraphName,
    createNewGraph,
    saveCurrentGraph,
    loadGraph,
    deleteGraph,
  } = useGraphStore();

  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!currentGraph) return false;
    if (currentGraph.nodes.length === 0) return false;
    if (!lastSavedAt) return true;
    return currentGraph.updatedAt > lastSavedAt;
  }, [currentGraph, lastSavedAt]);

  // Handle beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Wrap actions that would lose changes
  const confirmAction = useCallback((action: () => void) => {
    if (hasUnsavedChanges()) {
      setPendingAction(() => action);
      setIsUnsavedDialogOpen(true);
    } else {
      action();
    }
  }, [hasUnsavedChanges]);

  const handleSaveAndContinue = () => {
    saveCurrentGraph();
    setLastSavedAt(new Date());
    setIsUnsavedDialogOpen(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleDiscardAndContinue = () => {
    setIsUnsavedDialogOpen(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleSave = () => {
    saveCurrentGraph();
    setLastSavedAt(new Date());
    setIsSaveDialogOpen(false);
  };

  const handleExport = () => {
    if (!currentGraph) return;

    const dataStr = JSON.stringify(currentGraph, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentGraph.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-card shrink-0">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">Fermi Estimator</h1>
                <span className="text-muted-foreground">/</span>
                <Input
                  value={currentGraph?.name || 'New Estimate'}
                  onChange={(e) => updateGraphName(e.target.value)}
                  className="w-[200px] h-8 text-sm font-medium"
                  placeholder="Project name"
                />
                {hasUnsavedChanges() && (
                  <span className="text-xs text-muted-foreground">(unsaved)</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => confirmAction(createNewGraph)}>
                  New
                </Button>
                <Dialog open={isLoadDialogOpen} onOpenChange={(open) => {
                  if (open && hasUnsavedChanges()) {
                    confirmAction(() => setIsLoadDialogOpen(true));
                  } else {
                    setIsLoadDialogOpen(open);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Load
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Load Estimate</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {savedGraphs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No saved estimates yet
                        </p>
                      ) : (
                        savedGraphs.map((graph) => (
                          <div
                            key={graph.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted"
                          >
                            <div>
                              <p className="font-medium">{graph.name}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                                {graph.question || 'No question'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {graph.nodes.length} nodes
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  loadGraph(graph.id);
                                  setIsLoadDialogOpen(false);
                                }}
                              >
                                Load
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteGraph(graph.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Save
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Estimate</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Save &quot;{currentGraph?.name}&quot; to your local storage?
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setIsSaveDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleSave}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  Export
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Question input */}
        <div className="border-b bg-card shrink-0">
          <div className="container mx-auto px-4 py-3">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Question:
              </span>
              <Input
                value={currentGraph?.question || ''}
                onChange={(e) => updateQuestion(e.target.value)}
                placeholder="How many piano tuners are there in Chicago?"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex min-h-0">
          {/* Graph Editor - takes 2/3 of the space */}
          <div className="flex-[2] border-r">
            <GraphEditor />
          </div>

          {/* AI Chat - takes 1/3 of the space */}
          <div className="flex-1 flex flex-col min-w-[350px] max-w-[450px]">
            <AIChat />
          </div>
        </div>

        {/* Unsaved Changes Dialog */}
        <Dialog open={isUnsavedDialogOpen} onOpenChange={setIsUnsavedDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unsaved Changes</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              You have unsaved changes to &quot;{currentGraph?.name}&quot;. Would you like to save before continuing?
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsUnsavedDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDiscardAndContinue}>
                Discard
              </Button>
              <Button onClick={handleSaveAndContinue}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ReactFlowProvider>
  );
}
