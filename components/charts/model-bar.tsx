"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type ModelBarChartProps = {
  data: Array<{ model: string; tokens: number; cost: number; calls: number }>;
};

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

export function ModelBarChart({ data }: ModelBarChartProps) {
  const top10 = [...data].sort((a, b) => b.tokens - a.tokens).slice(0, 10);

  return (
    <div className="card-dark rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Token Usage by Model</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="model"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }}
            formatter={(v) => { const n = Number(v); return [n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString(), "Tokens"]; }}
          />
          <Bar dataKey="tokens" radius={[0, 4, 4, 0]}>
            {top10.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
