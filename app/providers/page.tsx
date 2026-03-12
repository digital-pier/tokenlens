"use client";

import { useEffect, useState } from "react";
import { getProviderColor, MODEL_PRICING } from "@/lib/pricing";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

type ProviderStat = {
  provider: string;
  cost: number;
  calls: number;
  tokens: number;
  errorRate: number;
};

type ModelStat = {
  model: string;
  cost: number;
  calls: number;
  tokens: number;
  inputCost: number;
  outputCost: number;
};

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

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderStat[]>([]);
  const [models, setModels] = useState<ModelStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((d) => {
        setProviders(d.providerStats || []);
        setModels(d.modelStats || []);
        setLoading(false);
      });
  }, []);

  const allProviders = Array.from(new Set(MODEL_PRICING.map((m) => m.provider)));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Provider Analytics</h1>
        <p className="text-sm text-slate-500">LLM provider spend, reliability, and model pricing</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 animate-pulse">Loading…</div>
      ) : (
        <>
          {/* Provider cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {providers.sort((a, b) => b.cost - a.cost).map((p) => (
              <div key={p.provider} className="card-dark rounded-xl p-4" style={{ borderColor: `${getProviderColor(p.provider)}30` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: getProviderColor(p.provider) }} />
                  <span className="text-sm font-semibold text-white capitalize">{p.provider}</span>
                </div>
                <p className="text-2xl font-bold text-white font-mono">{fmtCost(p.cost)}</p>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <p>{p.calls.toLocaleString()} calls</p>
                  <p>{fmtTokens(p.tokens)} tokens</p>
                  <p className={p.errorRate > 5 ? "text-red-400" : ""}>{p.errorRate.toFixed(1)}% error rate</p>
                </div>
              </div>
            ))}
          </div>

          {/* Cost chart */}
          <div className="card-dark rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Spend by Provider</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={providers.sort((a, b) => b.cost - a.cost)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                <XAxis dataKey="provider" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `$${v.toFixed(0)}`} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={50} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }}
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, "Cost"]} />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {providers.map((p) => (
                    <Cell key={p.provider} fill={getProviderColor(p.provider)} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Model cost table */}
          <div className="card-dark rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/60">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Model Usage This Period</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/40">
                    {["Model", "Provider", "Calls", "Tokens", "Total Cost", "Input Cost", "Output Cost"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {models.slice(0, 20).map((m, i) => {
                    const pricing = MODEL_PRICING.find((p) => p.model === m.model);
                    return (
                      <tr key={m.model} className={`border-b border-slate-800/20 hover:bg-slate-800/20 ${i % 2 === 0 ? "" : "bg-slate-900/20"}`}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">{m.model}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs capitalize" style={{ color: getProviderColor(pricing?.provider || "unknown") }}>
                            {pricing?.provider || "unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">{m.calls.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">{fmtTokens(m.tokens)}</td>
                        <td className="px-4 py-3 text-xs text-amber-400 font-mono font-bold">{fmtCost(m.cost)}</td>
                        <td className="px-4 py-3 text-xs text-emerald-400 font-mono">{fmtCost(m.inputCost)}</td>
                        <td className="px-4 py-3 text-xs text-blue-400 font-mono">{fmtCost(m.outputCost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Full pricing table */}
          <div className="card-dark rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/60">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Model Pricing Reference</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800/40">
                    {["Model", "Provider", "Input / 1M tokens", "Output / 1M tokens", "Context Window"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODEL_PRICING.sort((a, b) => a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model)).map((p, i) => (
                    <tr key={`${p.provider}-${p.model}`} className={`border-b border-slate-800/20 hover:bg-slate-800/20 ${i % 2 === 0 ? "" : "bg-slate-900/10"}`}>
                      <td className="px-4 py-2 font-mono text-slate-300">{p.model}</td>
                      <td className="px-4 py-2">
                        <span className="capitalize" style={{ color: getProviderColor(p.provider) }}>{p.provider}</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-emerald-400">${p.inputPer1M.toFixed(3)}</td>
                      <td className="px-4 py-2 font-mono text-blue-400">${p.outputPer1M.toFixed(3)}</td>
                      <td className="px-4 py-2 text-slate-500">{p.contextWindow?.toLocaleString() || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card-dark rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Cost Optimization Recommendations</h3>
            {models
              .filter((m) => {
                const p = MODEL_PRICING.find((x) => x.model === m.model);
                return p && (p.inputPer1M + p.outputPer1M) > 10;
              })
              .slice(0, 3)
              .map((m) => {
                const cheaper = MODEL_PRICING
                  .filter((p) => (p.inputPer1M + p.outputPer1M) < 2 && p.provider !== "unknown")
                  .sort((a, b) => a.inputPer1M - b.inputPer1M)[0];
                const savings = cheaper
                  ? m.cost - (m.tokens * 0.5 * cheaper.inputPer1M / 1_000_000 + m.tokens * 0.5 * cheaper.outputPer1M / 1_000_000)
                  : 0;
                return (
                  <div key={m.model} className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/10 rounded-lg px-4 py-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-slate-400">
                      Agents using <span className="text-white font-mono">{m.model}</span> could save approximately{" "}
                      <span className="text-emerald-400 font-bold">{fmtCost(savings)}</span> this period by switching to{" "}
                      <span className="text-white font-mono">{cheaper?.model || "a cheaper model"}</span> for low-complexity tasks.
                    </p>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
