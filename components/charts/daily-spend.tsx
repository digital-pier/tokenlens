"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { getProviderColor } from "@/lib/pricing";

type DailySpendChartProps = {
  data: Array<Record<string, string | number>>;
};

const PROVIDERS = ["openai", "anthropic", "google", "mistral", "cohere", "groq", "bedrock", "unknown"];

export function DailySpendChart({ data }: DailySpendChartProps) {
  const activeProviders = PROVIDERS.filter((p) =>
    data.some((d) => d[p] && Number(d[p]) > 0)
  );

  return (
    <div className="card-dark rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Daily Spend — Last 30 Days</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.slice(-30)} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => { try { return format(parseISO(v), "MMM d"); } catch { return v; } }}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, undefined]}
            labelFormatter={(l) => { try { return format(parseISO(l), "MMM d, yyyy"); } catch { return l; } }}
          />
          <Legend wrapperStyle={{ color: "#64748b", fontSize: 12 }} />
          {activeProviders.map((p) => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              stroke={getProviderColor(p)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
