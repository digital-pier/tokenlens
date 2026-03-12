"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type ProviderBarChartProps = {
  data: Array<{ provider: string; cost: number; calls: number; tokens: number; errorRate: number }>;
};

export function ProviderBarChart({ data }: ProviderBarChartProps) {
  return (
    <div className="card-dark rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Spend by Provider</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
          <XAxis dataKey="provider" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }}
            formatter={(v, name) => [
              name === "cost" ? `$${Number(v).toFixed(2)}` : Number(v).toLocaleString(),
              String(name),
            ]}
          />
          <Bar dataKey="cost" name="Cost ($)" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
