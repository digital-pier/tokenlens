import { NextRequest } from "next/server";
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
  const targetUrl =
    req.headers.get("x-target-url") || PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai;

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
