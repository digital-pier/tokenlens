import { NextRequest, NextResponse } from "next/server";
import { proxyLLMRequest, proxyLLMRequestStreaming } from "@/lib/proxy";
import { detectProvider } from "@/lib/pricing";

export const PROVIDER_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  google: "https://generativelanguage.googleapis.com/v1beta/models",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  cohere: "https://api.cohere.ai/v1/chat",
  groq: "https://api.groq.com/openai/v1/chat/completions",
};

export function buildProxyContext(req: NextRequest, body: Record<string, unknown>) {
  const agentId = req.headers.get("x-agent-id") || "unknown";
  const agentName = req.headers.get("x-agent-name") || "Unknown Agent";
  const department = req.headers.get("x-department") || "Unknown";
  const targetProvider = req.headers.get("x-provider") || "";
  const model = (body.model as string) || (body.modelId as string) || "unknown";

  const provider = targetProvider || detectProvider(model);
  const targetUrl = req.headers.get("x-target-url") || PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai;

  const forwardHeaders: Record<string, string> = { "Content-Type": "application/json" };
  const authHeader = req.headers.get("authorization");
  if (authHeader) forwardHeaders["Authorization"] = authHeader;

  const apiKey = req.headers.get("x-api-key");
  if (apiKey && provider === "anthropic") {
    forwardHeaders["x-api-key"] = apiKey;
    forwardHeaders["anthropic-version"] = "2023-06-01";
  } else if (apiKey) {
    forwardHeaders["Authorization"] = `Bearer ${apiKey}`;
  }

  return { agentId, agentName, department, provider, model, targetUrl, forwardHeaders };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, agentName, department, provider, model, targetUrl, forwardHeaders } =
      buildProxyContext(req, body);

    // Streaming request — pipe SSE straight back to the client
    if (body.stream === true) {
      const stream = await proxyLLMRequestStreaming({
        agentId,
        agentName,
        department,
        targetUrl,
        model,
        headers: forwardHeaders,
        body,
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming request
    const result = await proxyLLMRequest({
      agentId,
      agentName,
      department,
      targetUrl,
      model,
      headers: forwardHeaders,
      body,
    });

    return NextResponse.json(
      {
        ...((result.data as object) || {}),
        _tokenlens: {
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          totalTokens: result.totalTokens,
          latencyMs: result.latencyMs,
          provider,
          model,
        },
      },
      { status: result.status }
    );
  } catch (err) {
    console.error("Proxy error:", err);
    return NextResponse.json(
      { error: "Proxy request failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
