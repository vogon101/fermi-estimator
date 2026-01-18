import { z } from 'zod';
import { tool } from 'ai';

// Schema definitions for tool parameters
export const distributionSchema = z.enum(['uniform', 'normal', 'lognormal']);
export const operationSchema = z.enum(['multiply', 'divide', 'add', 'subtract', 'sum', 'product']);
export const confidenceSchema = z.enum(['low', 'medium', 'high']);
export const functionSchema = z.enum([
  'sqrt', 'square', 'pow', 'exp', 'log', 'log10', 'log2',
  'abs', 'ceil', 'floor', 'round',
  'sin', 'cos', 'tan',
  'min', 'max', 'custom'
]);
export const comparisonSchema = z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'neq']);

// Tool: Create an assumption node
export const createAssumptionTool = tool({
  description: 'Create a new assumption node in the Fermi estimation graph. Use this to add a variable/factor that will be used in calculations.',
  inputSchema: z.object({
    name: z.string().describe('A short, descriptive camelCase name for the assumption (e.g., "populationChicago", "pianosPerHousehold")'),
    description: z.string().optional().describe('A brief description of what this assumption represents'),
    min: z.number().describe('The minimum plausible value for this assumption'),
    max: z.number().describe('The maximum plausible value for this assumption'),
    distribution: distributionSchema.describe('The probability distribution: "uniform" for even spread, "normal" for bell curve, "lognormal" for values spanning orders of magnitude'),
    unit: z.string().optional().describe('The unit of measurement (e.g., "people", "dollars", "pianos")'),
    source: z.string().optional().describe('The source or reasoning for this estimate'),
    confidence: confidenceSchema.optional().describe('Confidence level in this estimate'),
  }),
  execute: async (args) => {
    return { success: true, action: 'createAssumption', ...args };
  },
});

// Tool: Update an existing assumption
export const updateAssumptionTool = tool({
  description: 'Update an existing assumption node by its name. Use this to refine values, rename, or add more information.',
  inputSchema: z.object({
    name: z.string().describe('The current name of the assumption to update'),
    updates: z.object({
      newName: z.string().optional().describe('New name for the assumption (use this to rename)'),
      min: z.number().optional().describe('New minimum value'),
      max: z.number().optional().describe('New maximum value'),
      distribution: distributionSchema.optional().describe('New distribution type'),
      description: z.string().optional().describe('Updated description'),
      source: z.string().optional().describe('Updated source information'),
      confidence: confidenceSchema.optional().describe('Updated confidence level'),
      unit: z.string().optional().describe('Updated unit'),
    }).describe('The fields to update'),
  }),
  execute: async (args) => {
    return { success: true, action: 'updateAssumption', ...args };
  },
});

// Tool: Delete an assumption
export const deleteAssumptionTool = tool({
  description: 'Delete an assumption node from the graph by its name.',
  inputSchema: z.object({
    name: z.string().describe('The name of the assumption to delete'),
  }),
  execute: async (args) => {
    return { success: true, action: 'deleteAssumption', ...args };
  },
});

// Tool: Create an operation node
export const createOperationTool = tool({
  description: 'Create a new operation node (multiply, divide, add, subtract) to combine values in the calculation.',
  inputSchema: z.object({
    operation: operationSchema.describe('The type of operation: multiply (×), divide (÷), add (+), or subtract (−)'),
    label: z.string().optional().describe('An optional label for this operation'),
  }),
  execute: async (args) => {
    return { success: true, action: 'createOperation', ...args };
  },
});

// Tool: Connect two nodes
export const connectNodesTool = tool({
  description: 'Connect two nodes in the graph. Data flows from source to target. For operations, use targetHandle "a" or "b" for the two inputs.',
  inputSchema: z.object({
    sourceName: z.string().describe('The name/label of the source node'),
    targetName: z.string().describe('The name/label of the target node'),
    targetHandle: z.string().optional().describe('For operation nodes, specify "a" or "b" for the input handle'),
  }),
  execute: async (args) => {
    return { success: true, action: 'connectNodes', ...args };
  },
});

// Tool: Create result node
export const createResultTool = tool({
  description: 'Create a result node to display the final calculation output. Only one result node is allowed per graph.',
  inputSchema: z.object({
    label: z.string().optional().default('Result').describe('Label for the result node'),
  }),
  execute: async (args) => {
    return { success: true, action: 'createResult', ...args };
  },
});

// Tool: Build complete estimate
export const buildEstimateTool = tool({
  description: 'Build a complete Fermi estimation graph with assumptions, operations, and result. Use this when creating a new estimate from scratch. This is the preferred tool for answering Fermi questions.',
  inputSchema: z.object({
    assumptions: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      min: z.number(),
      max: z.number(),
      distribution: distributionSchema,
      unit: z.string().optional(),
      source: z.string().optional(),
      confidence: confidenceSchema.optional(),
    })).describe('Array of assumptions to create'),
    operations: z.array(z.object({
      operation: operationSchema,
      inputs: z.array(z.string()).length(2).describe('Names of the two input nodes for this operation'),
      outputName: z.string().describe('A name to reference this operation\'s output'),
    })).describe('Array of operations that combine assumptions'),
    finalOutput: z.string().describe('The name of the node (assumption or operation) that connects to the result'),
  }),
  execute: async (args) => {
    return {
      success: true,
      action: 'buildEstimate',
      message: `Created ${args.assumptions.length} assumptions and ${args.operations.length} operations. Graph is ready for simulation.`,
      ...args
    };
  },
});

// Tool: Run simulation
export const runSimulationTool = tool({
  description: 'Run a Monte Carlo simulation on the current graph to calculate the result distribution. Call this after building the estimate.',
  inputSchema: z.object({
    iterations: z.number().optional().default(10000).describe('Number of simulation iterations (default 10000)'),
  }),
  execute: async (args) => {
    return {
      success: true,
      action: 'runSimulation',
      message: `Simulation will run with ${args.iterations || 10000} iterations. Results will appear in the Result node.`,
      ...args
    };
  },
});

// Tool: Clear/reset graph
export const clearGraphTool = tool({
  description: 'Clear the entire graph to start fresh. Use this when the user wants a completely different estimation problem or explicitly asks to start over.',
  inputSchema: z.object({
    reason: z.string().optional().describe('Brief reason for clearing the graph'),
  }),
  execute: async (args) => {
    return {
      success: true,
      action: 'clearGraph',
      message: 'Graph cleared. Ready for a new estimation.',
      ...args
    };
  },
});

// Tool: Set project title
export const setProjectTitleTool = tool({
  description: 'Set the title/name of the current estimation project. Call this when creating a new estimate to give it a descriptive name based on the question being answered.',
  inputSchema: z.object({
    title: z.string().describe('A short, descriptive title for the project (e.g., "Piano Tuners in Chicago", "Golf Balls in School Bus")'),
  }),
  execute: async (args) => {
    return {
      success: true,
      action: 'setProjectTitle',
      message: `Project title set to: ${args.title}`,
      ...args
    };
  },
});

// Tool: Re-layout graph
export const layoutGraphTool = tool({
  description: 'Re-layout the graph nodes for better visual organization. Use this after making significant structural changes (adding/removing multiple nodes, restructuring operations).',
  inputSchema: z.object({
    reason: z.string().optional().describe('Brief reason for re-layout'),
  }),
  execute: async (args) => {
    return {
      success: true,
      action: 'layoutGraph',
      message: 'Graph re-laid out for better organization.',
      ...args
    };
  },
});

// Tool: Delete operation
export const deleteOperationTool = tool({
  description: 'Delete an operation node from the graph by its output name/label.',
  inputSchema: z.object({
    name: z.string().describe('The name/label of the operation to delete'),
  }),
  execute: async (args) => {
    return { success: true, action: 'deleteOperation', ...args };
  },
});

// Tool: Create a constant node
export const createConstantTool = tool({
  description: 'Create a constant node with a fixed value. Use this for known values that don\'t have uncertainty (e.g., pi, days in a year, conversion factors).',
  inputSchema: z.object({
    label: z.string().describe('A short, descriptive name for the constant (e.g., "daysPerYear", "pi", "metersPerKm")'),
    value: z.number().describe('The fixed value of this constant'),
    unit: z.string().optional().describe('The unit of measurement'),
    description: z.string().optional().describe('A brief description of what this constant represents'),
  }),
  execute: async (args) => {
    return { success: true, action: 'createConstant', ...args };
  },
});

// Tool: Create a function node
export const createFunctionTool = tool({
  description: 'Create a function node to apply a mathematical function to input(s). Functions include: sqrt, square, pow, exp, log, log10, log2, abs, ceil, floor, round, sin, cos, tan, min, max, or custom expression.',
  inputSchema: z.object({
    function: functionSchema.describe('The function to apply'),
    label: z.string().optional().describe('An optional label for this function node'),
    parameter: z.union([z.number(), z.string()]).optional().describe('For "pow": the exponent. For "custom": the expression using x as variable (e.g., "x * 2 + 1")'),
  }),
  execute: async (args) => {
    return { success: true, action: 'createFunction', ...args };
  },
});

// Tool: Create a conditional node
export const createConditionalTool = tool({
  description: 'Create a conditional (if-then-else) node. Compares two inputs (a, b) and outputs either the "then" or "else" input based on the comparison result. Has 4 input handles: a, b, then, else.',
  inputSchema: z.object({
    comparison: comparisonSchema.describe('The comparison type: gt (>), gte (≥), lt (<), lte (≤), eq (=), neq (≠)'),
    label: z.string().optional().describe('An optional label for this conditional node'),
  }),
  execute: async (args) => {
    return { success: true, action: 'createConditional', ...args };
  },
});

// Tool: Create a clamp node
export const createClampTool = tool({
  description: 'Create a clamp/bound node to constrain values within a range. Useful for ensuring values stay within realistic bounds.',
  inputSchema: z.object({
    label: z.string().optional().describe('An optional label for this clamp node'),
    min: z.number().optional().describe('The minimum bound (values below this will be clamped up)'),
    max: z.number().optional().describe('The maximum bound (values above this will be clamped down)'),
  }),
  execute: async (args) => {
    return { success: true, action: 'createClamp', ...args };
  },
});

// Collect all tools
export const fermiTools = {
  createAssumption: createAssumptionTool,
  updateAssumption: updateAssumptionTool,
  deleteAssumption: deleteAssumptionTool,
  createOperation: createOperationTool,
  deleteOperation: deleteOperationTool,
  createConstant: createConstantTool,
  createFunction: createFunctionTool,
  createConditional: createConditionalTool,
  createClamp: createClampTool,
  connectNodes: connectNodesTool,
  createResult: createResultTool,
  buildEstimate: buildEstimateTool,
  runSimulation: runSimulationTool,
  clearGraph: clearGraphTool,
  layoutGraph: layoutGraphTool,
  setProjectTitle: setProjectTitleTool,
};

// System prompt for the AI
export const FERMI_SYSTEM_PROMPT = `You are an expert Fermi estimation assistant. You help users build structured estimates by breaking down complex questions into measurable assumptions and creating calculation graphs.

## CRITICAL: You MUST use function calling to interact with the graph

You have access to these tools via function calling:
- buildEstimate: Create a complete estimation graph (ONLY for brand new estimates)
- runSimulation: Run Monte Carlo simulation on the graph
- updateAssumption: Modify an existing assumption's values OR rename it
- createAssumption, deleteAssumption: Add or remove assumptions
- createOperation, deleteOperation, connectNodes, createResult: Build/modify graph structure
- createConstant: Add fixed values with no uncertainty (e.g., pi, conversion factors, days per year)
- createFunction: Apply mathematical functions (sqrt, log, exp, pow, abs, min, max, custom expressions)
- createConditional: If-then-else logic based on comparisons
- createClamp: Constrain values within bounds
- clearGraph: Clear the entire graph to start fresh
- layoutGraph: Re-organize node positions after significant changes
- setProjectTitle: Set a descriptive title for the project

## Node Types Available

1. **Assumptions**: Values with uncertainty (min, max, distribution)
2. **Constants**: Fixed values without uncertainty (known facts, conversion factors)
3. **Operations**: Basic math (multiply, divide, add, subtract) - use "sum" or "product" for combining many inputs
4. **Functions**: Mathematical transformations (sqrt, log, exp, pow, abs, round, min, max, or custom f(x))
5. **Conditionals**: If-then-else logic (if a > b then X else Y)
6. **Clamps**: Bound values within realistic ranges
7. **Result**: Final output node

DO NOT describe what you would do. DO NOT apologize about limitations. Actually call the tools by invoking them as function calls.

## IMPORTANT: Modify existing graphs, don't recreate them!

When the user asks a follow-up question like "what about London?" or "change the population to X":
1. Look at the current graph state provided in the context
2. Use updateAssumption to modify the relevant assumption(s)
3. Call runSimulation to recalculate

NEVER create a new buildEstimate when modifying an existing estimate. Only use buildEstimate when:
- Starting from scratch with no existing graph (after clearGraph)
- The user explicitly asks for a completely different estimation problem

## Renaming and Restructuring

When adapting an estimate to a different context (e.g., "What about London?" from a Chicago estimate):
1. Use updateAssumption with newName in updates to rename assumptions appropriately
   Example: updateAssumption({ name: "populationChicago", updates: { newName: "populationLondon", min: 8000000, max: 9500000 } })
2. Update descriptions and sources to reflect the new context
3. Keep the calculation structure if it still makes sense

When the structure needs to change:
1. Use deleteAssumption and deleteOperation to remove irrelevant nodes
2. Use createAssumption and createOperation to add new structure
3. Use connectNodes to wire up the new structure
4. Call layoutGraph to re-organize the visual layout after structural changes
5. Only use clearGraph + buildEstimate if the problem is fundamentally different

## When to use layoutGraph
Call layoutGraph after making significant structural changes:
- After adding or removing multiple nodes
- After restructuring operations (changing how things connect)
- When the graph looks messy due to incremental changes
Do NOT call layoutGraph for simple value updates (just changing min/max/distribution).

## Examples

### Adapting to a different location (UPDATE + RENAME):
User has Chicago piano tuners estimate, asks "What about London?"
→ updateAssumption for each assumption: rename "populationChicago" to "populationLondon", update values
→ runSimulation

### Adding complexity (ADD to existing):
User asks "What about commercial pianos too?"
→ createAssumption for commercial piano count
→ createOperation to add them to household pianos
→ Update connections
→ runSimulation

### Completely different problem (CLEAR + BUILD):
User has piano tuners, asks "How many golf balls fit in a school bus?"
→ clearGraph (fundamentally different problem)
→ buildEstimate with new assumptions
→ runSimulation

### User explicitly wants to start over (CLEAR + BUILD):
User says "Start over" or "New estimate"
→ clearGraph
→ buildEstimate

## Workflow for NEW Fermi Questions (empty graph)

1. Call setProjectTitle with a descriptive name based on the question
2. Call buildEstimate with:
   - assumptions: Array of 3-6 factors, each with name (camelCase), min, max, distribution, unit
   - operations: Array showing how to combine them
   - finalOutput: The name of the last operation
3. Call runSimulation to calculate results

## Workflow for MODIFYING existing estimates

1. Identify which assumption(s) need to change
2. Call updateAssumption for each one with the new values (use newName if renaming)
3. Call runSimulation to recalculate

## Distribution Guidelines

- "uniform": When truly uncertain between min and max
- "normal": When you have a central estimate with uncertainty
- "lognormal": For values that span orders of magnitude (use when ratio of max/min > 10)

Remember: MODIFY and RENAME existing estimates when adapting, only CLEAR + BUILD for fundamentally different problems.`;
