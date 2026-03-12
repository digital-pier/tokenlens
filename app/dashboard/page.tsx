"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Database } from "lucide-react";
import { KPICards } from "@/components/kpi-cards";
import { DailySpendChart } from "@/components/charts/daily-spend";
import { DeptPieChart } from "@/components/charts/dept-pie";
import { ModelBarChart } from "@/components/charts/model-bar";
import { ProviderBarChart } from "@/components/charts/provider-bar";
import { AgentTable } from "@/components/agent-table";
import { ActivityFeed } from "@/components/activity-feed";

type MetricsData = {
  kpis: {
    totalSpend: number;
    lastMonthSpend: number;
    spendChange: number;
    totalTokens: number;
    totalCalls: number;
    avgCostPerCall: number;
    activeAgents: number;
    orgBudget: number;
    budgetUsed: number;
    budgetRatio: number;
    projectedSpend: number;
    mostExpensiveAgent: { name: string; cost: number } | null;
  };
  dailySpend: Array<Record<string, string | number>>;
  deptSpend: Array<{ department: string; cost: number }>;
  providerStats: Array<{ provider: string; cost: number; calls: number; tokens: number; errorRate: number }>;
  modelStats: Array<{ model: string; tokens: number; cost: number; calls: number }>;
  agentStats: Array<{
    id: string; name: string; department: string; primaryModel: string | null;
    calls: number; tokens: number; promptTokens: number; completionTokens: number;
    cost: number; avgLatency: number; errorRate: number; updatedAt: string;
    status: string; budgetRatio: number; sparkline: number[];
  }>;
  recentCalls: Array<{
    id: string; provider: string; model: string; promptTokens: number;
    completionTokens: number; totalTokens: number; totalCost: number;
    latencyMs: number; success: boolean; errorMessage: string | null;
    createdAt: string; agent: { name: string; department: string };
  }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMetrics() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json();
      setData(d);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function runSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const d = await res.json();
      if (d.success) await fetchMetrics();
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => { fetchMetrics(); }, []);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">CFO Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time LLM spend intelligence · Acme Corp</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-lg hover:text-white hover:bg-slate-700/60 transition-all disabled:opacity-50"
          >
            <Database className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
            {seeding ? "Seeding…" : "Seed Demo Data"}
          </button>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-400 bg-blue-600/10 border border-blue-500/20 rounded-lg hover:bg-blue-600/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">
          <strong>Error:</strong> {error}
          <br />
          <span className="text-red-500/70 text-xs">If the database is empty, click "Seed Demo Data" above.</span>
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500 animate-pulse text-sm">Loading metrics…</div>
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <KPICards data={data.kpis} />

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <DailySpendChart data={data.dailySpend} />
            </div>
            <DeptPieChart data={data.deptSpend} />
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ModelBarChart data={data.modelStats} />
            <ProviderBarChart data={data.providerStats} />
          </div>

          {/* Agent leaderboard */}
          <AgentTable agents={data.agentStats} />

          {/* Activity feed */}
          <ActivityFeed calls={data.recentCalls as Parameters<typeof ActivityFeed>[0]["calls"]} />
        </>
      ) : null}
    </div>
  );
}
