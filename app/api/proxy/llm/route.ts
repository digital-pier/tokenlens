import { NextRequest, NextResponse } from "next/server";
import { proxyLLMRequest, proxyLLMRequestStreaming } from "@/lib/proxy";
import { buildProxyContext } from "@/lib/proxy/context";

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
