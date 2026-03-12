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
    let agent = await prisma.agent.findFirst({ where: { name: req.agentName } });
    if (!agent) {
      agent = await prisma.agent.create({
        data: {
          name: req.agentName,
          department: req.department || "Unknown",
          primaryModel: req.model,
          budgetLimit: 500,
        },
      });
    }

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

    let agent = await prisma.agent.findFirst({ where: { name: req.agentName } });
    if (!agent) {
      agent = await prisma.agent.create({
        data: {
          name: req.agentName,
          department: req.department || "Unknown",
          primaryModel: req.model,
          budgetLimit: 500,
        },
      });
    }

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
