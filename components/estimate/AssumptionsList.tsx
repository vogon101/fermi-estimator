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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssumptionCard } from './AssumptionCard';
import { useEstimateStore } from '@/lib/store';
import { generateEstimate } from '@/lib/gemini';
import type { Assumption, Distribution } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export function AssumptionsList() {
  const {
    currentEstimate,
    addAssumption,
    updateAssumption,
    removeAssumption,
    setAssumptions,
    updateFormula,
  } = useEstimateStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newAssumption, setNewAssumption] = useState<Omit<Assumption, 'id'>>({
    name: '',
    min: 0,
    max: 100,
    distribution: 'uniform',
  });

  const handleAddAssumption = () => {
    if (newAssumption.name) {
      addAssumption(newAssumption);
      setNewAssumption({
        name: '',
        min: 0,
        max: 100,
        distribution: 'uniform',
      });
      setIsAddDialogOpen(false);
    }
  };

  const handleGenerateFromQuestion = async () => {
    if (!currentEstimate?.question) return;

    setIsGenerating(true);
    try {
      const generated = await generateEstimate(currentEstimate.question);

      // Convert generated assumptions to full Assumption objects
      const newAssumptions: Assumption[] = generated.assumptions.map((a) => ({
        ...a,
        id: uuidv4(),
      }));

      setAssumptions(newAssumptions);
      updateFormula(generated.formula);
    } catch (error) {
      console.error('Failed to generate estimate:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const assumptions = currentEstimate?.assumptions || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Assumptions
        </h2>
        <span className="text-xs text-muted-foreground">{assumptions.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {assumptions.map((assumption) => (
          <AssumptionCard
            key={assumption.id}
            assumption={assumption}
            onUpdate={(updates) => updateAssumption(assumption.id, updates)}
            onDelete={() => removeAssumption(assumption.id)}
          />
        ))}

        {assumptions.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No assumptions yet.
            <br />
            Add one manually or generate from your question.
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1">
              + Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Assumption</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newAssumption.name}
                  onChange={(e) =>
                    setNewAssumption({ ...newAssumption, name: e.target.value })
                  }
                  placeholder="e.g., populationChicago"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min</Label>
                  <Input
                    type="number"
                    value={newAssumption.min}
                    onChange={(e) =>
                      setNewAssumption({
                        ...newAssumption,
                        min: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Max</Label>
                  <Input
                    type="number"
                    value={newAssumption.max}
                    onChange={(e) =>
                      setNewAssumption({
                        ...newAssumption,
                        max: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Distribution</Label>
                <Select
                  value={newAssumption.distribution}
                  onValueChange={(value: Distribution) =>
                    setNewAssumption({ ...newAssumption, distribution: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uniform">Uniform</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="lognormal">Log-normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit (optional)</Label>
                <Input
                  value={newAssumption.unit || ''}
                  onChange={(e) =>
                    setNewAssumption({ ...newAssumption, unit: e.target.value })
                  }
                  placeholder="e.g., people, dollars"
                />
              </div>
              <Button onClick={handleAddAssumption} className="w-full">
                Add Assumption
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={handleGenerateFromQuestion}
          disabled={isGenerating || !currentEstimate?.question}
        >
          {isGenerating ? 'Generating...' : 'AI Generate'}
        </Button>
      </div>
    </div>
  );
}
