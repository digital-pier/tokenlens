"use client";

import { useEffect, useState } from "react";
import { X, Bot, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

type AgentDetailData = {
  agent: {
    id: string;
    name: string;
    department: string;
    description: string | null;
    owner: string | null;
    primaryModel: string | null;
    budgetLimit: number;
    isActive: boolean;
  };
  kpis: {
    totalCost: number;
    totalTokens: number;
    totalCalls: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalInputCost: number;
    totalOutputCost: number;
    errors: number;
    errorRate: number;
    avgLatency: number;
    deptAvgCost: number;
  };
  budget: { limit: number; used: number; ratio: number } | null;
  calls: {
    data: Array<{
      id: string; model: string; provider: string; promptTokens: number;
      completionTokens: number; totalCost: number; latencyMs: number;
      success: boolean; errorMessage: string | null; createdAt: string;
    }>;
    total: number; page: number; limit: number;
  };
  dailyUsage: Array<{ date: string; cost: number; calls: number; tokens: number }>;
  modelBreakdown: Array<{ model: string; calls: number; cost: number; pct: number }>;
  topExpensive: Array<{
    id: string; model: string; provider: string; promptTokens: number;
    completionTokens: number; totalCost: number; latencyMs: number; createdAt: string;
  }>;
  errorLog: Array<{
    id: string; model: string; errorMessage: string | null; createdAt: string;
  }>;
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

function fmtCost(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}
function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}

export function AgentDetailModal({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const [data, setData] = useState<AgentDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/metrics/agent/${agentId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl h-full bg-slate-950 border-l border-slate-800/60 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{data?.agent.name || "Loading…"}</h2>
              <p className="text-xs text-slate-500">{data?.agent.department} · {data?.agent.owner || "—"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500 text-sm animate-pulse">Loading agent data…</div>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400 text-sm">Failed to load agent data</div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Description */}
            {data.agent.description && (
              <p className="text-sm text-slate-400 bg-slate-900/50 px-4 py-3 rounded-lg border border-slate-800/40">
                {data.agent.description}
              </p>
            )}

            {/* Budget */}
            {data.budget && (
              <div className="card-dark rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Monthly Budget</span>
                  <span className="text-xs font-mono text-slate-300">
                    {fmtCost(data.budget.used)} / {fmtCost(data.budget.limit)}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all",
                      data.budget.ratio >= 1 ? "bg-red-500" : data.budget.ratio >= 0.9 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(data.budget.ratio * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-slate-600">0%</span>
                  <span className={cn("text-[10px] font-medium",
                    data.budget.ratio >= 1 ? "text-red-400" : data.budget.ratio >= 0.7 ? "text-amber-400" : "text-slate-500"
                  )}>
                    {(data.budget.ratio * 100).toFixed(0)}% used
                  </span>
                </div>
              </div>
            )}

            {/* KPI grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Cost", value: fmtCost(data.kpis.totalCost), color: "text-blue-400" },
                { label: "Total Calls", value: data.kpis.totalCalls.toLocaleString(), color: "text-slate-300" },
                { label: "Total Tokens", value: fmtTokens(data.kpis.totalTokens), color: "text-slate-300" },
                { label: "Input Cost", value: fmtCost(data.kpis.totalInputCost), color: "text-emerald-400" },
                { label: "Output Cost", value: fmtCost(data.kpis.totalOutputCost), color: "text-amber-400" },
                { label: "Avg Latency", value: `${Math.round(data.kpis.avgLatency)}ms`, color: "text-slate-300" },
                { label: "Errors", value: String(data.kpis.errors), color: "text-red-400" },
                { label: "Error Rate", value: `${data.kpis.errorRate.toFixed(1)}%`, color: data.kpis.errorRate > 5 ? "text-red-400" : "text-slate-300" },
                { label: "vs Dept Avg", value: fmtCost(data.kpis.deptAvgCost), color: "text-slate-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/30">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className={cn("text-lg font-bold font-mono", color)}>{value}</p>
                </div>
              ))}
            </div>

            {/* Daily usage chart */}
            <div className="card-dark rounded-xl p-4">
              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Daily Cost — 30 Days</h4>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={data.dailyUsage.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} />
                  <YAxis tickFormatter={(v) => `$${v.toFixed(0)}`} tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0", fontSize: 11 }}
                    formatter={(v) => [`$${Number(v).toFixed(2)}`, "Cost"]} />
                  <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Model breakdown */}
            {data.modelBreakdown.length > 0 && (
              <div className="card-dark rounded-xl p-4">
                <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Model Usage</h4>
                <div className="flex gap-4">
                  <ResponsiveContainer width="40%" height={120}>
                    <PieChart>
                      <Pie data={data.modelBreakdown} dataKey="calls" nameKey="model" cx="50%" cy="50%" outerRadius={50} paddingAngle={3}>
                        {data.modelBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {data.modelBreakdown.map((m, i) => (
                      <div key={m.model} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="font-mono text-slate-400 truncate flex-1">{m.model}</span>
                        <span className="text-slate-500">{m.pct.toFixed(0)}%</span>
                        <span className="text-slate-300 font-mono">{fmtCost(m.cost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top expensive calls */}
            <div className="card-dark rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800/60">
                <h4 className="text-xs text-slate-500 uppercase tracking-wider">Top 10 Most Expensive Calls</h4>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800/40">
                    <th className="px-4 py-2 text-left text-slate-600 font-medium">Time</th>
                    <th className="px-4 py-2 text-left text-slate-600 font-medium">Model</th>
                    <th className="px-4 py-2 text-right text-slate-600 font-medium">Tokens</th>
                    <th className="px-4 py-2 text-right text-slate-600 font-medium">Cost</th>
                    <th className="px-4 py-2 text-right text-slate-600 font-medium">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topExpensive.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800/20 hover:bg-slate-800/20">
                      <td className="px-4 py-2 text-slate-500 font-mono">{format(new Date(c.createdAt), "MM/dd HH:mm")}</td>
                      <td className="px-4 py-2 text-slate-400 font-mono">{c.model.slice(0, 22)}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-400">{fmtTokens(c.promptTokens + c.completionTokens)}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-amber-400">{fmtCost(c.totalCost)}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-400">{c.latencyMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Error log */}
            {data.errorLog.length > 0 && (
              <div className="card-dark rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800/60 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider">Recent Errors</h4>
                </div>
                <div className="divide-y divide-slate-800/20">
                  {data.errorLog.map((e) => (
                    <div key={e.id} className="px-4 py-2.5 flex items-start gap-3">
                      <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-red-300">{e.errorMessage}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5 font-mono">{format(new Date(e.createdAt), "MM/dd HH:mm:ss")} · {e.model}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
