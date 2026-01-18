import { google } from '@ai-sdk/google';
import { generateText, stepCountIs } from 'ai';
import { NextResponse } from 'next/server';
import { fermiTools, FERMI_SYSTEM_PROMPT } from '@/lib/ai-tools';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, context, graphState } = body;

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Use Gemini 2.5 Flash
    const model = google('gemini-2.5-flash');

    // Build the prompt with context
    const contextInfo = graphState
      ? `\n\nCurrent graph state:\n${JSON.stringify(graphState, null, 2)}`
      : '';

    const fullPrompt = `${FERMI_SYSTEM_PROMPT}

${context ? `Additional context:\n${context}` : ''}${contextInfo}

User request: ${message}`;

    // Generate with tools and multi-step support
    // Note: Cannot combine custom tools with provider-defined tools (like google_search)
    const { text, steps } = await generateText({
      model,
      prompt: fullPrompt,
      tools: fermiTools,
      stopWhen: stepCountIs(10),
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 8192,
          },
        },
      },
    });

    // Extract all tool calls from all steps
    // Note: Vercel AI SDK uses 'input' not 'args' for tool call arguments
    const allToolCalls = steps.flatMap((step) =>
      step.toolCalls.map((tc: { toolName: string; input?: unknown; args?: unknown }) => ({
        toolName: tc.toolName,
        args: tc.input ?? tc.args ?? {},
      }))
    );

    // Extract tool results
    // Note: Vercel AI SDK uses 'output' not 'result' for tool results
    const toolResults = steps.flatMap((step) =>
      step.toolResults.map((tr: { toolName: string; output?: unknown; result?: unknown }) => ({
        toolName: tr.toolName,
        result: tr.output ?? tr.result,
      }))
    );

    return NextResponse.json({
      response: text,
      toolCalls: allToolCalls,
      toolResults,
    });
  } catch (error) {
    console.error('AI API error:', error);
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
