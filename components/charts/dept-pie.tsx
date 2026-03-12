"use client";

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const DEPT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
  "#f97316", "#a855f7", "#14b8a6",
];

type DeptPieChartProps = {
  data: Array<{ department: string; cost: number }>;
};

export function DeptPieChart({ data }: DeptPieChartProps) {
  const sorted = [...data].sort((a, b) => b.cost - a.cost);

  return (
    <div className="card-dark rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Cost by Department</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={sorted}
            dataKey="cost"
            nameKey="department"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
          >
            {sorted.map((entry, i) => (
              <Cell key={entry.department} fill={DEPT_COLORS[i % DEPT_COLORS.length]} opacity={0.85} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, "Spend"]}
          />
          <Legend
            formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>}
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
