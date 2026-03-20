/**
 * This route exists because the Anthropic SDK appends /v1/messages to whatever
 * baseURL you set. When a user sets baseURL to http://localhost:3000/api/proxy/llm,
 * the SDK calls http://localhost:3000/api/proxy/llm/v1/messages — this file handles that.
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyLLMRequest, proxyLLMRequestStreaming } from "@/lib/proxy";
import { buildProxyContext } from "../../route";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, agentName, department, provider, model, targetUrl, forwardHeaders } =
      buildProxyContext(req, body);

    // Streaming request
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
      { ...((result.data as object) || {}) },
      { status: result.status }
    );
  } catch (err) {
    console.error("Proxy /v1/messages error:", err);
    return NextResponse.json(
      { error: "Proxy request failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
