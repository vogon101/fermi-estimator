'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useEstimateStore } from '@/lib/store';
import { chat } from '@/lib/gemini';

export function LLMChat() {
  const { currentEstimate, chatMessages, addChatMessage, clearChat } =
    useEstimateStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    addChatMessage({
      role: 'user',
      content: userMessage,
    });

    setIsLoading(true);

    try {
      // Build context from current estimate
      const context = currentEstimate
        ? `Current question: ${currentEstimate.question || 'Not set'}
Assumptions:
${currentEstimate.assumptions.map((a) => `- ${a.name}: ${a.min} - ${a.max} ${a.unit || ''}`).join('\n') || 'None'}
Formula: ${currentEstimate.calculation?.formula || 'Not set'}`
        : undefined;

      const response = await chat(userMessage, context);

      addChatMessage({
        role: 'assistant',
        content: response,
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
    'What assumptions am I missing?',
    'Is my formula correct?',
    'What sources could validate my assumptions?',
    'How can I improve this estimate?',
  ];

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-semibold">AI Assistant</h3>
        {chatMessages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={clearChat}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px] max-h-[300px]">
        {chatMessages.length === 0 ? (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Ask me anything about your Fermi estimate:</p>
            <div className="flex flex-wrap gap-1">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
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
                  : 'bg-muted mr-8'
              } p-2 rounded-lg`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))
        )}
        {isLoading && (
          <div className="bg-muted mr-8 p-2 rounded-lg text-sm">
            <p className="text-muted-foreground animate-pulse">Thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your estimate..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </Button>
      </form>
    </Card>
  );
}
