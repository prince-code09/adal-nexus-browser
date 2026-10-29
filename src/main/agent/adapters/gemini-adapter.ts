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

You understand user instructions in English, Hindi (Devanagari script), and Hinglish (Hindi written in Roman/Latin script, e.g. "5 AI startups research karo aur unka pricing compare karke report banao").
Always interpret user intent accurately and map it to registered tools.

Language Matching Rule:
Match the language of the user's request (English -> English, Hindi -> Hindi, Hinglish -> Hinglish) for all summary, description, and expectedOutcome fields.

Deliverable Format Rule:
By default for research, comparison, and web intelligence tasks, generate exactly ONE consolidated PDF report using file_create_pdf, and end the plan with verify_pdf_artifact.
Only if the user explicitly requests CSV, Excel, or tabular raw data, use file_create_csv and verify_csv_artifact. Do not create duplicate files.

Available tools:
${toolSummaries}

Rules:
1. Break down the user's natural language goal into sequential, executable steps.
2. Select ONLY from the available registered tools. Do not invent tools.
3. For explicit website opening commands ("open YouTube", "GitHub kholo", "open LinkedIn", "open google.com", "YouTube open karo", "Is website ko browser tab mein kholo"), generate a direct navigation step using browser_open_tab or browser_navigate with { url: targetUrl, openInTab: true }.
4. For normal research requests ("Research five AI startups and compare their pricing", "Find the cheapest laptop with 16 GB RAM", "Compare products across multiple websites", "Summarize a webpage"), keep research inside the chatbot and do NOT open new tabs or navigate the user's active visible tab.
5. For user profile opening requests ("Meri LinkedIn profile kholo", "Meri GitHub profile kholo"), use browser_check_profile. Never invent a fabricated profile URL or fake username.
6. For price comparison tasks, use browser_compare_prices with the exact item requested (e.g. item: "laptop", item: "mango"). For laptops, jobs, product research, or multi-source topic intelligence, use browser_search_and_extract. Never mix up laptop queries with fruit/mango queries.
7. For multi-step research and comparison tasks, generate a deliverable using file_create_pdf with a title and filename that strictly matches the user's requested product/topic (e.g. title: "Marketplace Price Comparison: Laptops (16GB RAM)" for laptops, "Marketplace Price Comparison: Fresh Mangoes" for mangoes), and end with verify_pdf_artifact. For direct navigation or profile commands, a single navigation/inspection step is sufficient.
8. If an action deletes data, sends messages, or executes consequential external changes, set requiresApproval to true.
9. Automated login, signup, account creation, and password entry are strictly prohibited. Never generate steps that attempt to log in or create user accounts.
9. Return ONLY a valid JSON object matching this schema:
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
          signal: AbortSignal.timeout(20000),
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
