'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { AssumptionsList } from './AssumptionsList';
import { CalculationEditor } from './CalculationEditor';
import { ResultsPanel } from './ResultsPanel';
import { LLMChat } from './LLMChat';
import { useEstimateStore } from '@/lib/store';

export function EstimateBuilder() {
  const {
    currentEstimate,
    savedEstimates,
    updateQuestion,
    createNewEstimate,
    saveCurrentEstimate,
    loadEstimate,
    deleteEstimate,
  } = useEstimateStore();

  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  const handleExport = () => {
    if (!currentEstimate) return;

    const dataStr = JSON.stringify(currentEstimate, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEstimate.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Fermi Estimator</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => createNewEstimate()}>
                New
              </Button>
              <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
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
                    {savedEstimates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No saved estimates yet
                      </p>
                    ) : (
                      savedEstimates.map((estimate) => (
                        <div
                          key={estimate.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted"
                        >
                          <div>
                            <p className="font-medium">{estimate.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {estimate.question || 'No question'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                loadEstimate(estimate.id);
                                setIsLoadDialogOpen(false);
                              }}
                            >
                              Load
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteEstimate(estimate.id)}
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
                      Save &quot;{currentEstimate?.name}&quot; to your local storage?
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsSaveDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          saveCurrentEstimate();
                          setIsSaveDialogOpen(false);
                        }}
                      >
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
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-muted-foreground">
              Question:
            </span>
            <Input
              value={currentEstimate?.question || ''}
              onChange={(e) => updateQuestion(e.target.value)}
              placeholder="How many piano tuners are there in Chicago?"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assumptions */}
          <Card className="p-4 h-[500px] overflow-hidden">
            <AssumptionsList />
          </Card>

          {/* Calculation */}
          <Card className="p-4 h-[500px] overflow-hidden">
            <CalculationEditor />
          </Card>

          {/* Results */}
          <Card className="p-4 h-[500px] overflow-hidden">
            <ResultsPanel />
          </Card>
        </div>

        {/* AI Chat */}
        <div className="mt-6">
          <LLMChat />
        </div>
      </main>
    </div>
  );
}
