import type { GeneratedEstimate, EnrichedAssumption, Assumption } from './types';

const GENERATE_ESTIMATE_PROMPT = `You are an expert at Fermi estimation - breaking down complex questions into measurable assumptions.

Given a question, generate a structured Fermi estimate with:
1. A list of 3-6 key assumptions needed to answer the question
2. A simple formula that combines these assumptions

For each assumption provide:
- name: a short, descriptive camelCase name (e.g., "populationChicago", "pianosPerHousehold")
- description: what this assumption represents
- min: the lower bound of a plausible range
- max: the upper bound of a plausible range
- distribution: "uniform" for evenly distributed values, "normal" for bell-curved values centered around the mean, "lognormal" for values that span orders of magnitude
- unit: the unit of measurement (optional)

The formula should use assumption names and basic math operators (+, -, *, /).

Respond with valid JSON only, no markdown:
{
  "question": "the original question",
  "assumptions": [
    {
      "name": "assumptionName",
      "description": "what this measures",
      "min": 100,
      "max": 200,
      "distribution": "uniform",
      "unit": "units"
    }
  ],
  "formula": "assumption1 * assumption2 / assumption3"
}`;

const ENRICH_ASSUMPTION_PROMPT = `You are an expert researcher helping to refine Fermi estimation assumptions with real-world data.

Given an assumption about a quantity, provide:
1. A plausible min/max range based on available data
2. A source or reasoning for the estimate
3. Your confidence level in the estimate

Respond with valid JSON only, no markdown:
{
  "min": 100,
  "max": 200,
  "source": "Brief description of source or reasoning",
  "confidence": "low" | "medium" | "high",
  "reasoning": "Detailed explanation of how you arrived at this range"
}`;

export async function generateEstimate(question: string): Promise<GeneratedEstimate> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate',
      question,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate estimate');
  }

  return response.json();
}

export async function enrichAssumption(assumption: Assumption): Promise<EnrichedAssumption> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'enrich',
      assumption,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to enrich assumption');
  }

  return response.json();
}

export async function chat(message: string, context?: string): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chat',
      message,
      context,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get response');
  }

  const data = await response.json();
  return data.response;
}

export { GENERATE_ESTIMATE_PROMPT, ENRICH_ASSUMPTION_PROMPT };
