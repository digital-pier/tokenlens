import { calculateCost, detectProvider } from "@/lib/pricing";
import prisma from "@/lib/prisma/client";

export type ProxyRequest = {
  agentId: string;
  agentName: string;
  department: string;
  targetUrl: string;
  model: string;
  headers: Record<string, string>;
  body: unknown;
};

export type ProxyResult = {
  success: boolean;
  status: number;
  data: unknown;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  errorMessage?: string;
};

async function findOrCreateAgent(agentName: string, department: string, model: string) {
  let agent = await prisma.agent.findFirst({ where: { name: agentName } });
  if (!agent) {
    agent = await prisma.agent.create({
      data: {
        name: agentName,
        department: department || "Unknown",
        primaryModel: model,
        budgetLimit: 500,
      },
    });
  }
  return agent;
}

/**
 * Streaming proxy — pipes SSE chunks straight to the caller while
 * collecting token counts from the stream events for logging.
 */
export async function proxyLLMRequestStreaming(req: ProxyRequest): Promise<ReadableStream<Uint8Array>> {
  const start = Date.now();
  const provider = detectProvider(req.model);

  const upstream = await fetch(req.targetUrl, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify(req.body),
  });

  if (!upstream.ok || !upstream.body) {
    throw new Error(`Upstream error: ${upstream.status} ${upstream.statusText}`);
  }

  const agent = await findOrCreateAgent(req.agentName, req.department, req.model);
  const agentId = agent.id;

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let promptTokens = 0;
  let completionTokens = 0;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Pass the raw bytes straight through to the client
          controller.enqueue(value);

          // Parse SSE lines to capture token usage without blocking the stream
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload);
              // Anthropic: input tokens in message_start
              if (evt.type === "message_start" && evt.message?.usage) {
                promptTokens = evt.message.usage.input_tokens ?? 0;
              }
              // Anthropic: output tokens in message_delta
              if (evt.type === "message_delta" && evt.usage) {
                completionTokens = evt.usage.output_tokens ?? 0;
              }
              // OpenAI: usage in final chunk (requires stream_options.include_usage)
              if (evt.usage?.prompt_tokens !== undefined) {
                promptTokens = evt.usage.prompt_tokens;
                completionTokens = evt.usage.completion_tokens ?? 0;
              }
            } catch {
              // not a JSON line, skip
            }
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }

      // Log to DB after stream ends (regardless of error)
      const latencyMs = Date.now() - start;
      const totalTokens = promptTokens + completionTokens;
      const { inputCost, outputCost, totalCost } = calculateCost(promptTokens, completionTokens, req.model, provider);
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      await checkAndAlertBudget(agentId, req.agentName, month, totalCost);
      await prisma.apiCall.create({
        data: {
          agentId,
          provider,
          model: req.model,
          promptTokens,
          completionTokens,
          totalTokens,
          inputCost,
          outputCost,
          totalCost,
          latencyMs,
          success: true,
          requestMetadata: JSON.stringify({ model: req.model, provider, stream: true }),
          responseMetadata: JSON.stringify({ streamed: true }),
        },
      });
    },
  });
}

export async function proxyLLMRequest(req: ProxyRequest): Promise<ProxyResult> {
  const start = Date.now();
  const provider = detectProvider(req.model);

  try {
    const response = await fetch(req.targetUrl, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(req.body),
    });

    const latencyMs = Date.now() - start;
    const data = await response.json();

    let promptTokens = 0;
    let completionTokens = 0;

    // Extract token usage from different provider formats
    if (data?.usage) {
      // OpenAI / Mistral / Groq
      promptTokens = data.usage.prompt_tokens ?? data.usage.input_tokens ?? 0;
      completionTokens = data.usage.completion_tokens ?? data.usage.output_tokens ?? 0;
    }
    if (data?.usageMetadata) {
      // Google Gemini
      promptTokens = data.usageMetadata.promptTokenCount ?? 0;
      completionTokens = data.usageMetadata.candidatesTokenCount ?? 0;
    }

    const totalTokens = promptTokens + completionTokens;
    const { inputCost, outputCost, totalCost } = calculateCost(promptTokens, completionTokens, req.model, provider);

    // Find or create agent
    const agent = await findOrCreateAgent(req.agentName, req.department, req.model);

    // Check budget
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await checkAndAlertBudget(agent.id, req.agentName, month, totalCost);

    await prisma.apiCall.create({
      data: {
        agentId: agent.id,
        provider,
        model: req.model,
        promptTokens,
        completionTokens,
        totalTokens,
        inputCost,
        outputCost,
        totalCost,
        latencyMs,
        success: response.ok,
        errorMessage: response.ok ? null : `HTTP ${response.status}`,
        requestMetadata: JSON.stringify({ model: req.model, provider }),
        responseMetadata: JSON.stringify({ finish_reason: "stop" }),
      },
    });

    return {
      success: response.ok,
      status: response.status,
      data,
      promptTokens,
      completionTokens,
      totalTokens,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    const agent = await findOrCreateAgent(req.agentName, req.department, req.model);

    await prisma.apiCall.create({
      data: {
        agentId: agent.id,
        provider,
        model: req.model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        latencyMs,
        success: false,
        errorMessage,
      },
    });

    return {
      success: false,
      status: 500,
      data: { error: errorMessage },
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs,
      errorMessage,
    };
  }
}

async function checkAndAlertBudget(agentId: string, agentName: string, month: string, newCost: number) {
  const budget = await prisma.budget.findFirst({
    where: { agentId, month, type: "agent" },
  });

  if (!budget) return;

  const spent = await prisma.apiCall.aggregate({
    where: { agentId },
    _sum: { totalCost: true },
  });

  const totalSpent = (spent._sum.totalCost ?? 0) + newCost;
  const ratio = totalSpent / budget.monthlyLimit;

  if (ratio >= budget.blockAt) {
    console.warn(`[BUDGET BLOCK] Agent "${agentName}" has exceeded budget: $${totalSpent.toFixed(2)} / $${budget.monthlyLimit}`);
  } else if (ratio >= budget.criticalAt) {
    console.warn(`[BUDGET CRITICAL] Agent "${agentName}" at ${(ratio * 100).toFixed(0)}% of budget`);
  } else if (ratio >= budget.warnAt) {
    console.warn(`[BUDGET WARN] Agent "${agentName}" at ${(ratio * 100).toFixed(0)}% of budget`);
  }
}
