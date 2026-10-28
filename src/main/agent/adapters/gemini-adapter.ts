import type { AIProviderAdapter } from './ai-adapter';
import type { ExecutionPlan } from '../../../shared/types';
import type { ToolDefinition } from '../types';
import { ExecutionPlanSchema } from '../validation';

export class GeminiAIAdapter implements AIProviderAdapter {
  public providerName = 'gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-1.5-pro-latest') {
    this.apiKey = apiKey;
    this.model = model;
  }

  public async generatePlan(goal: string, tools: ToolDefinition[]): Promise<ExecutionPlan> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is required. Please set it in Settings.');
    }

    const toolSummaries = tools
      .map((t) => `- ${t.name}: ${t.description} (params: ${JSON.stringify(t.parameters)})`)
      .join('\n');

    const systemPrompt = `You are AdaL Nexus, an AI task planner for an autonomous browser agent.
Your core principle is: Plans. Executes. Verifies.

Available tools:
${toolSummaries}

Rules:
1. Break down the user's natural language goal into sequential, executable steps.
2. Select ONLY from the available registered tools. Do not invent tools.
3. Every plan must end with an independent verification step (such as verify_csv_artifact).
4. If an action deletes data, sends messages, or executes consequential external changes, set requiresApproval to true.
5. Return ONLY a valid JSON object matching this schema:
{
  "goal": string,
  "summary": string,
  "steps": [
    {
      "id": string,
      "order": number,
      "description": string,
      "tool": string,
      "params": object,
      "requiresApproval": boolean,
      "expectedOutcome": string
    }
  ]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: `User Goal: "${goal}"` },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as any;
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('No plan text returned by Gemini API');
    }

    const parsedJson = JSON.parse(candidateText);
    const validated = ExecutionPlanSchema.parse({
      ...parsedJson,
      createdAt: Date.now(),
      steps: (parsedJson.steps || []).map((s: any, idx: number) => ({
        ...s,
        id: s.id || `step-${idx + 1}`,
        order: s.order || idx + 1,
        status: 'pending',
      })),
    });

    return validated;
  }
}
