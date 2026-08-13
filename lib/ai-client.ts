/**
 * AI client — supports Anthropic Claude and OpenRouter (OpenAI-compatible).
 * Prefers Claude direct (ANTHROPIC_API_KEY) — this powers client-facing
 * clinical plan generation, so it must run on a capable model. OpenRouter
 * (OPENROUTER_API_KEY) is the fallback; template-only if neither is set.
 */

export interface AiConfig {
  provider: "openrouter" | "claude" | null;
  model: string;
}

export function getAiConfig(): AiConfig {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "claude",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return {
      provider: "openrouter",
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-5",
    };
  }
  return { provider: null, model: "" };
}

/**
 * Quality-critical routes (e.g. Plan Agent) should never silently fall back to a
 * cheaper/lesser model — a bad plan costs Esther more time to fix than a slower,
 * costlier good one. Use this to override the configured model for those routes.
 *
 * Overridable via env so a candidate model can be A/B tested against Esther's
 * quality bar without a redeploy — see PLAN_QUALITY_MODEL_CLAUDE /
 * PLAN_QUALITY_MODEL_OPENROUTER.
 *
 * 2026-08-13: was hardcoded to Opus 4.8 — one full 6-week block generation fires
 * up to 18 concurrent calls, each resending the ~35-40k token system prompt
 * (exercise library + rules) with no caching, at Opus rates via OpenRouter's
 * markup. That burned ~£30 of OpenRouter credit in 5 minutes. Defaulted to
 * DeepSeek V3.1 (~20x cheaper input/output than Opus, 164K context, built for
 * structured/tool-calling output, and OpenRouter passes through its provider-side
 * automatic prompt caching — no cache_control needed on our side). The existing
 * validate-and-repair loop in planGeneration.ts is the safety net for any
 * quality gap versus Opus; if repairs start firing constantly, that is the
 * signal to reconsider the model before reconsidering caching/concurrency.
 */
export const QUALITY_MODEL = {
  claude: process.env.PLAN_QUALITY_MODEL_CLAUDE || "claude-sonnet-5",
  openrouter: process.env.PLAN_QUALITY_MODEL_OPENROUTER || "deepseek/deepseek-chat-v3.1",
} as const;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  system: string;
  user?: string;
  messages?: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Override the configured model for this call (provider-appropriate id). */
  model?: string;
}

function toMessages(req: ChatRequest): ChatMessage[] {
  return req.messages ?? [{ role: "user", content: req.user ?? "" }];
}

export async function aiChat(req: ChatRequest): Promise<string | null> {
  const config = getAiConfig();
  if (!config.provider) return null;

  const model = req.model ?? config.model;

  if (config.provider === "openrouter") {
    return openRouterChat(model, req);
  }

  return claudeChat(model, req);
}

export async function aiChatStream(req: ChatRequest): Promise<ReadableStream<Uint8Array> | null> {
  const config = getAiConfig();
  if (!config.provider) return null;

  const model = req.model ?? config.model;

  if (config.provider === "openrouter") {
    return openRouterChatStream(model, req);
  }

  return claudeChatStream(model, req);
}

async function openRouterChat(
  model: string,
  req: ChatRequest,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY!;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://eternal-fitness.co.uk",
      "X-Title": "Eternal Fitness",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: req.system },
        ...toMessages(req),
      ],
      max_tokens: req.maxTokens ?? 4000,
      temperature: req.temperature ?? 0.5,
      // See openRouterChatStream — avoid Bedrock's silent content-filter drops.
      provider: { order: ["Anthropic"], allow_fallbacks: true },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter error (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned empty response");
  return content;
}

async function openRouterChatStream(
  model: string,
  req: ChatRequest,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENROUTER_API_KEY!;
  const logTag = `[ai-client openrouter:${model}]`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://eternal-fitness.co.uk",
      "X-Title": "Eternal Fitness",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: req.system },
        ...toMessages(req),
      ],
      max_tokens: req.maxTokens ?? 4000,
      temperature: req.temperature ?? 0.5,
      stream: true,
      // Prefer routing straight to Anthropic rather than a downstream provider
      // (e.g. Amazon Bedrock) — Bedrock runs its own content moderation layer
      // that can silently drop the whole response (empty content, no error) on
      // clinical/health-heavy prompts, which is exactly what this app sends.
      provider: { order: ["Anthropic"], allow_fallbacks: true },
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    console.error(`${logTag} request failed (${res.status}): ${text.slice(0, 300)}`);
    throw new Error(`OpenRouter error (${res.status}): ${text.slice(0, 300)}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = res.body.getReader();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      let contentLength = 0;
      let finishReason: string | null = null;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              const delta = choice?.delta?.content;
              if (delta) {
                contentLength += delta.length;
                controller.enqueue(encoder.encode(delta));
              }
              if (choice?.finish_reason) finishReason = choice.finish_reason;
            } catch {
              // skip malformed SSE chunk
            }
          }
        }
        console.log(`${logTag} finished: contentLength=${contentLength} finishReason=${finishReason}`);
        if (contentLength === 0) {
          const reasonText = finishReason ? ` (finish_reason: ${finishReason})` : "";
          controller.enqueue(
            encoder.encode(
              `\n\n**[Plan Agent returned no content${reasonText}. This can happen when the provider's ` +
                `content filter silently blocks a response — try rephrasing, or ask Craig to check the server logs.]**`,
            ),
          );
        }
      } catch (err) {
        console.error(`${logTag} stream error: ${err instanceof Error ? err.message : err}`);
        controller.enqueue(encoder.encode(`\n\n[Error: ${err instanceof Error ? err.message : "stream failed"}]`));
      } finally {
        controller.close();
      }
    },
  });
}

/** Marks the (large, static-per-call) system prompt as cacheable so a run of
 *  calls sharing the same system text — e.g. every session in one block
 *  generation, or every turn of a Plan Agent chat — only pays full price on
 *  the first hit and reads from cache after. No effect on OpenRouter (a
 *  different beast — see QUALITY_MODEL's doc comment on DeepSeek's automatic
 *  provider-side caching instead). Below the ~1024-token minimum cacheable
 *  prefix, the marker is silently a no-op. */
function toSystemBlocks(system: string) {
  return [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }];
}

async function claudeChat(
  model: string,
  req: ChatRequest,
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const response = await client.messages.create({
    model,
    max_tokens: req.maxTokens ?? 4000,
    system: toSystemBlocks(req.system),
    messages: toMessages(req),
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  if (!text) throw new Error("Claude returned empty response");
  return text;
}

async function claudeChatStream(
  model: string,
  req: ChatRequest,
): Promise<ReadableStream<Uint8Array>> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const logTag = `[ai-client claude:${model}]`;

  const stream = client.messages.stream({
    model,
    max_tokens: req.maxTokens ?? 4000,
    system: toSystemBlocks(req.system),
    messages: toMessages(req),
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let contentLength = 0;
      let stopReason: string | null = null;
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            contentLength += chunk.delta.text.length;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
          if (chunk.type === "message_delta" && chunk.delta.stop_reason) {
            stopReason = chunk.delta.stop_reason;
          }
        }
        console.log(`${logTag} finished: contentLength=${contentLength} stopReason=${stopReason}`);
        if (contentLength === 0) {
          const reasonText = stopReason ? ` (stop_reason: ${stopReason})` : "";
          controller.enqueue(
            encoder.encode(
              `\n\n**[Plan Agent returned no content${reasonText}. Try rephrasing, or ask Craig to check the server logs.]**`,
            ),
          );
        }
      } catch (err) {
        console.error(`${logTag} stream error: ${err instanceof Error ? err.message : err}`);
        controller.enqueue(encoder.encode(`\n\n[Error: ${err instanceof Error ? err.message : "stream failed"}]`));
      } finally {
        controller.close();
      }
    },
  });
}
