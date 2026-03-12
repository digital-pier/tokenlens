import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const now = new Date();
    const startDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = to ? new Date(to) : now;

    const agent = await prisma.agent.findUnique({ where: { id: params.id } });
    if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [calls, totalCount] = await Promise.all([
      prisma.apiCall.findMany({
        where: { agentId: params.id, createdAt: { gte: startDate, lte: endDate } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.apiCall.count({
        where: { agentId: params.id, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    const allCalls = await prisma.apiCall.findMany({
      where: { agentId: params.id, createdAt: { gte: startDate, lte: endDate } },
      select: {
        totalCost: true, inputCost: true, outputCost: true,
        promptTokens: true, completionTokens: true, totalTokens: true,
        latencyMs: true, success: true, model: true, createdAt: true,
      },
    });

    const totalCost = allCalls.reduce((s, c) => s + c.totalCost, 0);
    const totalTokens = allCalls.reduce((s, c) => s + c.totalTokens, 0);
    const totalPromptTokens = allCalls.reduce((s, c) => s + c.promptTokens, 0);
    const totalCompletionTokens = allCalls.reduce((s, c) => s + c.completionTokens, 0);
    const totalInputCost = allCalls.reduce((s, c) => s + c.inputCost, 0);
    const totalOutputCost = allCalls.reduce((s, c) => s + c.outputCost, 0);
    const errors = allCalls.filter((c) => !c.success).length;
    const avgLatency = allCalls.length > 0 ? allCalls.reduce((s, c) => s + c.latencyMs, 0) / allCalls.length : 0;

    // Daily usage (30 days)
    const dailyMap: Record<string, { cost: number; calls: number; tokens: number }> = {};
    for (const call of allCalls) {
      const day = call.createdAt.toISOString().split("T")[0];
      if (!dailyMap[day]) dailyMap[day] = { cost: 0, calls: 0, tokens: 0 };
      dailyMap[day].cost += call.totalCost;
      dailyMap[day].calls++;
      dailyMap[day].tokens += call.totalTokens;
    }
    const dailyUsage = Object.entries(dailyMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Model breakdown
    const modelMap: Record<string, { calls: number; cost: number }> = {};
    for (const call of allCalls) {
      if (!modelMap[call.model]) modelMap[call.model] = { calls: 0, cost: 0 };
      modelMap[call.model].calls++;
      modelMap[call.model].cost += call.totalCost;
    }
    const modelBreakdown = Object.entries(modelMap).map(([model, stats]) => ({
      model,
      ...stats,
      pct: allCalls.length > 0 ? (stats.calls / allCalls.length) * 100 : 0,
    }));

    // Top 10 most expensive calls
    const topExpensive = await prisma.apiCall.findMany({
      where: { agentId: params.id },
      orderBy: { totalCost: "desc" },
      take: 10,
    });

    // Error log
    const errorLog = await prisma.apiCall.findMany({
      where: { agentId: params.id, success: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Budget
    const now2 = new Date();
    const month = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, "0")}`;
    const budget = await prisma.budget.findFirst({
      where: { agentId: params.id, type: "agent", month },
    });

    // Dept avg
    const deptAgents = await prisma.agent.findMany({ where: { department: agent.department } });
    const deptAgentIds = deptAgents.map((a) => a.id);
    const deptCalls = await prisma.apiCall.findMany({
      where: { agentId: { in: deptAgentIds }, createdAt: { gte: startDate, lte: endDate } },
      select: { totalCost: true },
    });
    const deptAvgCost = deptAgents.length > 0
      ? deptCalls.reduce((s, c) => s + c.totalCost, 0) / deptAgents.length
      : 0;

    return NextResponse.json({
      agent,
      kpis: {
        totalCost, totalTokens, totalCalls: allCalls.length,
        totalPromptTokens, totalCompletionTokens,
        totalInputCost, totalOutputCost,
        errors, errorRate: allCalls.length > 0 ? (errors / allCalls.length) * 100 : 0,
        avgLatency,
        deptAvgCost,
      },
      budget: budget ? { limit: budget.monthlyLimit, used: totalCost, ratio: totalCost / budget.monthlyLimit } : null,
      calls: { data: calls, total: totalCount, page, limit },
      dailyUsage,
      modelBreakdown,
      topExpensive,
      errorLog,
    });
  } catch (err) {
    console.error("Agent metrics error:", err);
    return NextResponse.json({ error: "Failed to fetch agent metrics", details: String(err) }, { status: 500 });
  }
}
