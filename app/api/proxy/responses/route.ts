import { NextRequest, NextResponse } from "next/server";
import { proxyLLMRequest } from "@/lib/proxy";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const agentId = req.headers.get("x-agent-id") || "unknown";
    const agentName = req.headers.get("x-agent-name") || "Unknown Agent";
    const department = req.headers.get("x-department") || "Unknown";
    const model = body.model || "unknown";

    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const authHeader = req.headers.get("authorization");
    if (authHeader) forwardHeaders["Authorization"] = authHeader;

    const result = await proxyLLMRequest({
      agentId,
      agentName,
      department,
      targetUrl: "https://api.openai.com/v1/responses",
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
          provider: "openai",
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
