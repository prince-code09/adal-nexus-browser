import type { AIProviderAdapter } from './ai-adapter';
import type { ExecutionPlan } from '../../../shared/types';
import type { ToolDefinition } from '../types';
import { ExecutionPlanSchema } from '../validation';

export class GeminiAIAdapter implements AIProviderAdapter {
  public providerName = 'gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-3.5-flash') {
    this.apiKey = apiKey;
    this.model = model || 'gemini-3.5-flash';
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
5. Automated login, signup, account creation, and password entry are strictly prohibited. Never generate steps that attempt to log in or create user accounts.
6. Return ONLY a valid JSON object matching this schema:
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
    
    let lastErr = '';
    let response: Response | null = null;
    
    for (let attempt = 0; attempt <= 1; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }

      try {
        response = await fetch(url, {
          method: 'POST',
          signal: AbortSignal.timeout(6000),
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

        if (response.ok) {
          break;
        }

        lastErr = await response.text();
        // Only retry once on transient 503 or 429
        if (response.status !== 503 && response.status !== 429) {
          break;
        }
      } catch (e: any) {
        lastErr = e?.message || String(e);
        break;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Gemini API error (${response?.status || 500}): ${lastErr}`);
    }

    const data = (await response.json()) as any;
    const parts = data.candidates?.[0]?.content?.parts || [];
    // Select the part containing JSON text (skipping pure thoughts if any)
    const jsonPart = parts.find((p: any) => p.text && (p.text.includes('"steps"') || p.text.includes('"goal"'))) || parts[parts.length - 1] || parts[0];
    const candidateText = jsonPart?.text;
    if (!candidateText) {
      throw new Error('No plan text returned by Gemini API');
    }

    let cleanText = candidateText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedJson = JSON.parse(cleanText);
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
