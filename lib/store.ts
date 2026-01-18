import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Assumption, Estimate, SimulationResult, ChatMessage } from './types';

interface EstimateState {
  // Current estimate
  currentEstimate: Estimate | null;
  simulationResult: SimulationResult | null;

  // Saved estimates
  savedEstimates: Estimate[];

  // Chat messages
  chatMessages: ChatMessage[];

  // Actions - Estimate
  createNewEstimate: (question?: string) => void;
  updateQuestion: (question: string) => void;
  updateEstimateName: (name: string) => void;

  // Actions - Assumptions
  addAssumption: (assumption: Omit<Assumption, 'id'>) => void;
  updateAssumption: (id: string, updates: Partial<Assumption>) => void;
  removeAssumption: (id: string) => void;

  // Actions - Calculation
  updateFormula: (formula: string) => void;

  // Actions - Simulation
  setSimulationResult: (result: SimulationResult | null) => void;

  // Actions - Save/Load
  saveCurrentEstimate: () => void;
  loadEstimate: (id: string) => void;
  deleteEstimate: (id: string) => void;

  // Actions - Chat
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;

  // Actions - Bulk operations
  setAssumptions: (assumptions: Assumption[]) => void;
}

const createEmptyEstimate = (question: string = ''): Estimate => ({
  id: uuidv4(),
  name: 'New Estimate',
  question,
  assumptions: [],
  calculation: {
    id: uuidv4(),
    name: 'Result',
    formula: '',
    assumptions: [],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const useEstimateStore = create<EstimateState>()(
  persist(
    (set, get) => ({
      currentEstimate: createEmptyEstimate(),
      simulationResult: null,
      savedEstimates: [],
      chatMessages: [],

      createNewEstimate: (question = '') => {
        set({
          currentEstimate: createEmptyEstimate(question),
          simulationResult: null,
          chatMessages: [],
        });
      },

      updateQuestion: (question) => {
        const { currentEstimate } = get();
        if (currentEstimate) {
          set({
            currentEstimate: {
              ...currentEstimate,
              question,
              updatedAt: new Date(),
            },
          });
        }
      },

      updateEstimateName: (name) => {
        const { currentEstimate } = get();
        if (currentEstimate) {
          set({
            currentEstimate: {
              ...currentEstimate,
              name,
              updatedAt: new Date(),
            },
          });
        }
      },

      addAssumption: (assumption) => {
        const { currentEstimate } = get();
        if (currentEstimate) {
          const newAssumption: Assumption = {
            ...assumption,
            id: uuidv4(),
          };
          set({
            currentEstimate: {
              ...currentEstimate,
              assumptions: [...currentEstimate.assumptions, newAssumption],
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },

      updateAssumption: (id, updates) => {
        const { currentEstimate } = get();
        if (currentEstimate) {
          set({
            currentEstimate: {
              ...currentEstimate,
              assumptions: currentEstimate.assumptions.map((a) =>
                a.id === id ? { ...a, ...updates } : a
              ),
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },

      removeAssumption: (id) => {
        const { currentEstimate } = get();
        if (currentEstimate) {
          set({
            currentEstimate: {
              ...currentEstimate,
              assumptions: currentEstimate.assumptions.filter((a) => a.id !== id),
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },

      updateFormula: (formula) => {
        const { currentEstimate } = get();
        if (currentEstimate) {
          const assumptionNames = currentEstimate.assumptions.map((a) => a.name);
          const referencedAssumptions = assumptionNames.filter((name) =>
            formula.includes(name)
          );
          set({
            currentEstimate: {
              ...currentEstimate,
              calculation: {
                ...currentEstimate.calculation,
                formula,
                assumptions: referencedAssumptions,
              },
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },

      setSimulationResult: (result) => {
        set({ simulationResult: result });
      },

      saveCurrentEstimate: () => {
        const { currentEstimate, savedEstimates } = get();
        if (currentEstimate) {
          const existingIndex = savedEstimates.findIndex(
            (e) => e.id === currentEstimate.id
          );
          if (existingIndex >= 0) {
            const updated = [...savedEstimates];
            updated[existingIndex] = currentEstimate;
            set({ savedEstimates: updated });
          } else {
            set({ savedEstimates: [...savedEstimates, currentEstimate] });
          }
        }
      },

      loadEstimate: (id) => {
        const { savedEstimates } = get();
        const estimate = savedEstimates.find((e) => e.id === id);
        if (estimate) {
          set({
            currentEstimate: { ...estimate },
            simulationResult: null,
            chatMessages: [],
          });
        }
      },

      deleteEstimate: (id) => {
        const { savedEstimates } = get();
        set({
          savedEstimates: savedEstimates.filter((e) => e.id !== id),
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

      setAssumptions: (assumptions) => {
        const { currentEstimate } = get();
        if (currentEstimate) {
          set({
            currentEstimate: {
              ...currentEstimate,
              assumptions,
              updatedAt: new Date(),
            },
            simulationResult: null,
          });
        }
      },
    }),
    {
      name: 'fermi-estimator-storage',
      partialize: (state) => ({
        savedEstimates: state.savedEstimates,
      }),
    }
  )
);
