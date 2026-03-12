import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";

function getDateRange(req: NextRequest) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const now = new Date();
  const endDate = to ? new Date(to) : now;
  const startDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);

  return { startDate, endDate };
}

export async function GET(req: NextRequest) {
  try {
    const { startDate, endDate } = getDateRange(req);

    const [
      thisMonthCalls,
      lastMonthCalls,
      allAgents,
      recentCalls,
      budgets,
      settings,
    ] = await Promise.all([
      prisma.apiCall.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: {
          agentId: true,
          provider: true,
          model: true,
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          totalCost: true,
          inputCost: true,
          outputCost: true,
          latencyMs: true,
          success: true,
          createdAt: true,
        },
      }),
      prisma.apiCall.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1),
            lt: startDate,
          },
        },
        select: { totalCost: true },
      }),
      prisma.agent.findMany(),
      prisma.apiCall.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { agent: { select: { name: true, department: true } } },
      }),
      prisma.budget.findMany(),
      prisma.settings.findMany(),
    ]);

    const totalSpend = thisMonthCalls.reduce((s, c) => s + c.totalCost, 0);
    const lastMonthSpend = lastMonthCalls.reduce((s, c) => s + c.totalCost, 0);
    const totalTokens = thisMonthCalls.reduce((s, c) => s + c.totalTokens, 0);
    const totalCalls = thisMonthCalls.length;
    const avgCostPerCall = totalCalls > 0 ? totalSpend / totalCalls : 0;

    // Daily spend (last 30 days)
    const dailyMap: Record<string, Record<string, number>> = {};
    for (const call of thisMonthCalls) {
      const day = call.createdAt.toISOString().split("T")[0];
      if (!dailyMap[day]) dailyMap[day] = {};
      dailyMap[day][call.provider] = (dailyMap[day][call.provider] || 0) + call.totalCost;
    }
    const dailySpend = Object.entries(dailyMap)
      .map(([date, providers]) => ({ date, ...providers }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Agent stats
    const agentMap: Record<string, {
      agentId: string; calls: number; tokens: number; promptTokens: number;
      completionTokens: number; cost: number; errors: number; totalLatency: number;
    }> = {};
    for (const call of thisMonthCalls) {
      if (!agentMap[call.agentId]) {
        agentMap[call.agentId] = { agentId: call.agentId, calls: 0, tokens: 0, promptTokens: 0, completionTokens: 0, cost: 0, errors: 0, totalLatency: 0 };
      }
      const a = agentMap[call.agentId];
      a.calls++;
      a.tokens += call.totalTokens;
      a.promptTokens += call.promptTokens;
      a.completionTokens += call.completionTokens;
      a.cost += call.totalCost;
      a.totalLatency += call.latencyMs;
      if (!call.success) a.errors++;
    }

    const agentStats = allAgents.map((agent) => {
      const stats = agentMap[agent.id] || { calls: 0, tokens: 0, promptTokens: 0, completionTokens: 0, cost: 0, errors: 0, totalLatency: 0 };
      const budget = budgets.find((b) => b.agentId === agent.id && b.type === "agent");
      const budgetUsed = budget ? stats.cost / budget.monthlyLimit : 0;
      const status = budgetUsed >= 1.0 ? "over_budget" : stats.calls === 0 ? "idle" : "active";

      // 7-day sparkline
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sparkline = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const dayStr = d.toISOString().split("T")[0];
        return dailyMap[dayStr]?.[agent.id] || 0;
      });

      return {
        ...agent,
        calls: stats.calls,
        tokens: stats.tokens,
        promptTokens: stats.promptTokens,
        completionTokens: stats.completionTokens,
        cost: stats.cost,
        avgLatency: stats.calls > 0 ? stats.totalLatency / stats.calls : 0,
        errorRate: stats.calls > 0 ? (stats.errors / stats.calls) * 100 : 0,
        budgetLimit: agent.budgetLimit,
        budgetUsed: stats.cost,
        budgetRatio: budgetUsed,
        status,
        sparkline,
      };
    });

    // Department spend
    const deptMap: Record<string, number> = {};
    for (const agent of agentStats) {
      deptMap[agent.department] = (deptMap[agent.department] || 0) + agent.cost;
    }
    const deptSpend = Object.entries(deptMap).map(([department, cost]) => ({ department, cost }));

    // Provider spend
    const providerMap: Record<string, { cost: number; calls: number; tokens: number; errors: number }> = {};
    for (const call of thisMonthCalls) {
      if (!providerMap[call.provider]) providerMap[call.provider] = { cost: 0, calls: 0, tokens: 0, errors: 0 };
      providerMap[call.provider].cost += call.totalCost;
      providerMap[call.provider].calls++;
      providerMap[call.provider].tokens += call.totalTokens;
      if (!call.success) providerMap[call.provider].errors++;
    }
    const providerStats = Object.entries(providerMap).map(([provider, stats]) => ({
      provider,
      ...stats,
      errorRate: stats.calls > 0 ? (stats.errors / stats.calls) * 100 : 0,
    }));

    // Model usage
    const modelMap: Record<string, { cost: number; calls: number; tokens: number; inputCost: number; outputCost: number }> = {};
    for (const call of thisMonthCalls) {
      if (!modelMap[call.model]) modelMap[call.model] = { cost: 0, calls: 0, tokens: 0, inputCost: 0, outputCost: 0 };
      modelMap[call.model].cost += call.totalCost;
      modelMap[call.model].calls++;
      modelMap[call.model].tokens += call.totalTokens;
      modelMap[call.model].inputCost += call.inputCost;
      modelMap[call.model].outputCost += call.outputCost;
    }
    const modelStats = Object.entries(modelMap)
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.cost - a.cost);

    // Projected month-end spend
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedSpend = dayOfMonth > 0 ? (totalSpend / dayOfMonth) * daysInMonth : 0;

    // Org budget
    const orgBudgetSetting = settings.find((s) => s.key === "org_budget");
    const orgBudget = orgBudgetSetting ? parseFloat(orgBudgetSetting.value) : 8000;

    const mostExpensiveAgent = agentStats.sort((a, b) => b.cost - a.cost)[0];
    const activeAgents = agentStats.filter((a) => a.status === "active").length;

    return NextResponse.json({
      kpis: {
        totalSpend,
        lastMonthSpend,
        spendChange: lastMonthSpend > 0 ? ((totalSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0,
        totalTokens,
        totalCalls,
        avgCostPerCall,
        activeAgents,
        orgBudget,
        budgetUsed: totalSpend,
        budgetRatio: totalSpend / orgBudget,
        projectedSpend,
        mostExpensiveAgent: mostExpensiveAgent ? { name: mostExpensiveAgent.name, cost: mostExpensiveAgent.cost } : null,
      },
      dailySpend,
      deptSpend,
      providerStats,
      modelStats,
      agentStats,
      recentCalls,
    });
  } catch (err) {
    console.error("Metrics error:", err);
    return NextResponse.json({ error: "Failed to fetch metrics", details: String(err) }, { status: 500 });
  }
}
