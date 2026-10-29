import type { AIProviderAdapter, TaskContext } from './ai-adapter';
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

  public async generatePlan(
    goal: string,
    tools: ToolDefinition[],
    context?: TaskContext
  ): Promise<ExecutionPlan> {
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

Mode Selection Rules:
1. Mode A: Conversational & Informational Queries (THE DEFAULT)
   • When the user asks a question, definition, guide, advice, or explanation (e.g., "What is YouTube?", "What is LinkedIn?", "Which laptop is best with 16 GB RAM?", "What are the best Java DSA playlists?", "Notes Gallery kya hai?", "DSTL kya hai?"):
   • DO NOT navigate browser tabs. DO NOT generate PDF or CSV files.
   • Generate a single step using tool "chat_response" with parameter { "message": "<your complete, helpful, well-formatted answer>" }. Put the same answer in the "summary" field.
   • When an attached image is provided and the user asks for a caption, description, or post text (e.g. "Is image ke liye LinkedIn description likho", "Write a caption for this photo", "Generate 3 post options"):
     - Respond in chat using "chat_response" providing 3 well-crafted caption variations: Professional, Casual/Engaging, and Storytelling/Inspiring, each with suitable hashtags and calls to action. Do not navigate tabs.

2. Mode B: Direct Website Opening
   • When the user instructs to open or visit a known platform or website:
     - Examples: "bhai linkdin kholo", "linkdin open karo", "YouTube kholo", "open gmail", "amazon open karo", "GitHub kholo", "open twitter", "Notes Gallery kholo".
     - Strip colloquial prefixes like "bhai", "yaar", "bro", "arre", "please", "ab".
     - Correct phonetic typos ("linkdin" -> LinkedIn, "yt" -> YouTube).
     - Direct URLs:
       * LinkedIn -> "https://www.linkedin.com/"
       * Microsoft Office -> "https://www.office.com/"
       * BBD University -> "https://bbdu.ac.in/"
       * YouTube -> "https://www.youtube.com/"
       * Gmail -> "https://mail.google.com/"
       * Amazon -> "https://www.amazon.in/"
       * GitHub -> "https://github.com/"
       * Notes Gallery -> tool "notes_gallery_open"
     - For unfamiliar website opening commands (e.g. "Hackbriven website kholo"):
       * Search Google for "[Entity] official website" instead of inventing unverified URLs.
     - NEVER perform a Google search for queries like "bhai linkdin kholo". Open the platform URL directly using "browser_open_tab"!

3. Mode C: Explicit Website Actions & Consequential Operations
   • When the user commands the agent to publish or prepare a post on LinkedIn:
     - E.g. "LinkedIn kholo aur meri ye post upload karo: [text]" or "Post this photo on LinkedIn with caption [text]"
     - Step 1: "browser_open_tab" to "https://www.linkedin.com"
     - Step 2: "browser_linkedin_post" with { "postText": extractedText, "imagePath": context?.attachedImage?.path, "imageData": context?.attachedImage?.dataUrl, "imageName": context?.attachedImage?.name, "action": "publish" } and "requiresApproval": true.
   • For visual matching / reverse image search requests (e.g. "ye images ke visual matched find kro", "find matching images for this photo"):
     - Step 1: "browser_visual_match" with { "imageName": context?.attachedImage?.name || "image", "imageData": context?.attachedImage?.dataUrl, "queryContext": ... }
     - Step 2: "browser_navigate" to "https://www.google.com/search?tbm=isch&q=..." with openInTab: true
   • For YouTube playback tasks (e.g., "open youtube and saiyara gana chalao", "play a song or video on YouTube", "YouTube kholo aur Java DSA ki achhi series chalao"):
     - Extract the EXACT user target query (song name, video topic, artist, or playlist name, e.g. "saiyara", "Java DSA", "lofi beats"). NEVER default to or substitute "Java DSA" or any unrelated example!
     - Step 1: "browser_navigate" to "https://www.youtube.com/results?search_query=..." with openInTab: true
     - Step 2: "browser_youtube_play" with { "query": exactExtractedQuery, "openInTab": true }
   • For Notes Gallery & study resources (e.g., "bhai aktu btech 2nd year ka pyq kholo notes gallery se", "Notes Gallery kholo aur DSTL Unit 2 ke PYQs dikhao"):
     - Extract authentic academic entities (university, course, year, subject, category). NEVER substitute DSTL if another subject or general PYQ was asked!
     - Step 1: "notes_gallery_search_and_open" with { "subject": ..., "university": ..., "course": ..., "year": ..., "unit": ..., "category": "PYQ", "action": "open" }
   • For file deletion requests:
     - Step 1: "file_delete" with { "path": ... } and "requiresApproval": true.

4. Mode D: Multi-Step Research & Price Comparison
   • For requests explicitly asking to research across multiple vendors/startups and compile a report (e.g., "Research five AI startups and compare their pricing"):
   • Use background research tools ("browser_navigate", "browser_extract_startups", "browser_compare_prices", or "browser_search_and_extract").
   • Create exactly ONE consolidated PDF report using "file_create_pdf", and end with "verify_pdf_artifact".

Language Matching Rule:
Match the language of the user's request (English -> English, Hindi -> Hindi, Hinglish -> Hinglish) for all summary, description, and message fields.

Available tools:
${toolSummaries}

Return ONLY a valid JSON object matching this schema:
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

    const previousContextText = context?.previousQueries && context.previousQueries.length > 0
      ? `Previous Conversation Context (last queries):\n${context.previousQueries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}\n\n`
      : '';
    
    for (let attempt = 0; attempt <= 1; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }

      const promptParts: any[] = [{ text: systemPrompt }];

      if (context?.attachedImage?.dataUrl) {
        const match = context.attachedImage.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          promptParts.push({
            inline_data: {
              mime_type: match[1] || 'image/jpeg',
              data: match[2],
            },
          });
        }
      }

      promptParts.push({
        text: `${previousContextText}${context?.attachedImage ? `[Attached Image: ${context.attachedImage.name}]\n` : ''}User Goal: "${goal}"`,
      });

      try {
        response = await fetch(url, {
          method: 'POST',
          signal: AbortSignal.timeout(20000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: promptParts,
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
