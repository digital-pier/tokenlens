"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentDetailModal } from "@/components/agent-detail-modal";

type AgentRow = {
  id: string;
  name: string;
  department: string;
  primaryModel: string | null;
  calls: number;
  tokens: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  avgLatency: number;
  errorRate: number;
  updatedAt: string;
  status: string;
  budgetRatio: number;
  sparkline: number[];
};

type SortKey = keyof AgentRow;
type SortDir = "asc" | "desc";

function StatusBadge({ status, ratio }: { status: string; ratio: number }) {
  if (status === "over_budget") return <span className="status-over-budget px-2 py-0.5 rounded text-xs font-medium">Over Budget</span>;
  if (status === "idle") return <span className="status-idle px-2 py-0.5 rounded text-xs font-medium">Idle</span>;
  if (ratio >= 0.9) return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-medium">Critical</span>;
  if (ratio >= 0.7) return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded text-xs font-medium">Warning</span>;
  return <span className="status-active px-2 py-0.5 rounded text-xs font-medium">Active</span>;
}

function Sparkline({ values }: { values: number[] }) {
  if (!values || values.length === 0) return <span className="text-slate-600">—</span>;
  const max = Math.max(...values, 0.001);
  const h = 20;
  const w = 50;
  const step = w / (values.length - 1 || 1);

  const points = values.map((v, i) => ({
    x: i * step,
    y: h - (v / max) * h * 0.85 + 2,
  }));

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={d} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SortIcon({ col, sortKey, dir }: { col: string; sortKey: string; dir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-slate-600 inline ml-1" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 text-blue-400 inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-blue-400 inline ml-1" />;
}

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

export function AgentTable({ agents }: { agents: AgentRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = [...agents].sort((a, b) => {
    const av = a[sortKey] as number | string;
    const bv = b[sortKey] as number | string;
    if (typeof av === "number" && typeof bv === "number") {
      return sortDir === "asc" ? av - bv : bv - av;
    }
    return sortDir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const cols: { key: SortKey; label: string; className?: string }[] = [
    { key: "name", label: "Agent" },
    { key: "department", label: "Dept" },
    { key: "primaryModel", label: "Model" },
    { key: "calls", label: "Calls", className: "text-right" },
    { key: "tokens", label: "Tokens", className: "text-right" },
    { key: "cost", label: "Cost", className: "text-right" },
    { key: "avgLatency", label: "Avg Lat.", className: "text-right" },
    { key: "errorRate", label: "Err%", className: "text-right" },
    { key: "budgetRatio", label: "Budget", className: "text-right" },
    { key: "status", label: "Status" },
  ];

  return (
    <>
      <div className="card-dark rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Agent Leaderboard</h3>
          <span className="text-xs text-slate-600">{agents.length} agents</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/60">
                {cols.map(({ key, label, className }) => (
                  <th
                    key={key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-300 transition-colors whitespace-nowrap",
                      className
                    )}
                    onClick={() => toggleSort(key)}
                  >
                    {label}
                    <SortIcon col={key} sortKey={sortKey} dir={sortDir} />
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">7d Trend</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((agent, i) => (
                <tr
                  key={agent.id}
                  className={cn(
                    "border-b border-slate-800/30 cursor-pointer hover:bg-slate-800/30 transition-colors",
                    i % 2 === 0 ? "bg-transparent" : "bg-slate-900/20"
                  )}
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{agent.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">{agent.department}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400 font-mono">{agent.primaryModel || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300 font-mono text-xs">{agent.calls.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-300 font-mono text-xs">{fmtTokens(agent.tokens)}</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-xs">
                    <span className={agent.cost > 500 ? "text-amber-400" : "text-emerald-400"}>{fmtCost(agent.cost)}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300 font-mono text-xs">
                    {agent.avgLatency > 0 ? `${Math.round(agent.avgLatency)}ms` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    <span className={agent.errorRate > 5 ? "text-red-400" : "text-slate-400"}>
                      {agent.errorRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", agent.budgetRatio >= 1 ? "bg-red-500" : agent.budgetRatio >= 0.7 ? "bg-amber-500" : "bg-emerald-500")}
                          style={{ width: `${Math.min(agent.budgetRatio * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-mono w-8 text-right">{Math.min(agent.budgetRatio * 100, 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={agent.status} ratio={agent.budgetRatio} />
                  </td>
                  <td className="px-4 py-3">
                    <Sparkline values={agent.sparkline} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAgentId && (
        <AgentDetailModal
          agentId={selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
        />
      )}
    </>
  );
}
