import type { AIProviderAdapter } from './ai-adapter';
import type { ExecutionPlan } from '../../../shared/types';
import type { ToolDefinition } from '../types';
import { ExecutionPlanSchema } from '../validation';

export class OpenAICompatibleAdapter implements AIProviderAdapter {
  public providerName: string;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(
    apiKey: string,
    model = 'gpt-4o-mini',
    baseUrl = 'https://api.openai.com/v1',
    providerName = 'openai'
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.providerName = providerName;
  }

  public async generatePlan(goal: string, tools: ToolDefinition[]): Promise<ExecutionPlan> {
    if (!this.apiKey) {
      throw new Error(`${this.providerName} API key is required. Please set it in Settings.`);
    }

    const toolSummaries = tools
      .map((t) => `- ${t.name}: ${t.description} (params: ${JSON.stringify(t.parameters)})`)
      .join('\n');

    const systemPrompt = `You are AdaL Nexus, an AI task planner for an autonomous browser agent.
Tagline: Plans. Executes. Verifies.

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

    const url = `${this.baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Goal: "${goal}"` },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${this.providerName} API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`Empty response from ${this.providerName} API`);
    }

    const parsedJson = JSON.parse(content);
    return ExecutionPlanSchema.parse({
      ...parsedJson,
      createdAt: Date.now(),
      steps: (parsedJson.steps || []).map((s: any, idx: number) => ({
        ...s,
        id: s.id || `step-${idx + 1}`,
        order: s.order || idx + 1,
        status: 'pending',
      })),
    });
  }
}
