import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "calls";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const now = new Date();
  const startDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = to ? new Date(to) : now;

  if (type === "calls") {
    const calls = await prisma.apiCall.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { agent: { select: { name: true, department: true } } },
      orderBy: { createdAt: "desc" },
    });

    const csv = [
      "timestamp,agent,department,provider,model,prompt_tokens,completion_tokens,total_tokens,input_cost,output_cost,total_cost,latency_ms,success,error",
      ...calls.map((c) =>
        [
          c.createdAt.toISOString(),
          c.agent.name,
          c.agent.department,
          c.provider,
          c.model,
          c.promptTokens,
          c.completionTokens,
          c.totalTokens,
          c.inputCost.toFixed(6),
          c.outputCost.toFixed(6),
          c.totalCost.toFixed(6),
          c.latencyMs,
          c.success,
          c.errorMessage || "",
        ].join(",")
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tokenlens-calls-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  if (type === "agents") {
    const agents = await prisma.agent.findMany();
    const callData = await prisma.apiCall.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalCost: true, totalTokens: true, promptTokens: true, completionTokens: true },
      _count: { id: true },
      _avg: { latencyMs: true },
    });

    const map = Object.fromEntries(callData.map((d) => [d.agentId, d]));

    const csv = [
      "agent,department,primary_model,total_calls,total_tokens,input_tokens,output_tokens,total_cost,avg_latency_ms,budget_limit",
      ...agents.map((a) => {
        const d = map[a.id];
        return [
          a.name,
          a.department,
          a.primaryModel || "",
          d?._count.id || 0,
          d?._sum.totalTokens || 0,
          d?._sum.promptTokens || 0,
          d?._sum.completionTokens || 0,
          (d?._sum.totalCost || 0).toFixed(4),
          (d?._avg.latencyMs || 0).toFixed(0),
          a.budgetLimit,
        ].join(",");
      }),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tokenlens-agents-${startDate.toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
