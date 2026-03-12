"use client";

import { TrendingUp, TrendingDown, Minus, DollarSign, Zap, Activity, Bot, Clock, AlertTriangle, Target, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type KPIData = {
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

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCost(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function fmtTokens(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}

function Trend({ pct }: { pct: number }) {
  if (Math.abs(pct) < 0.1) return <span className="flex items-center gap-1 text-slate-400 text-xs"><Minus className="w-3 h-3" />0%</span>;
  const up = pct > 0;
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", up ? "text-red-400" : "text-emerald-400")}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

type CardProps = {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor?: string;
  glowClass?: string;
  trend?: number;
  children?: React.ReactNode;
};

function KPICard({ title, value, sub, icon: Icon, iconColor = "text-blue-400", glowClass = "glow-blue", trend, children }: CardProps) {
  return (
    <div className={cn("card-dark rounded-xl p-4 flex flex-col gap-3", glowClass)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={cn("w-7 h-7 rounded-lg bg-slate-800/80 flex items-center justify-center")}>
          <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        </div>
      </div>
      <div>
        <p className={cn("text-2xl font-bold text-white text-mono")}>{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        {trend !== undefined && <Trend pct={trend} />}
        {children}
      </div>
    </div>
  );
}

export function KPICards({ data }: { data: KPIData }) {
  const budgetPct = Math.min(data.budgetRatio * 100, 100);
  const budgetColor = budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        title="Total Spend (MTD)"
        value={fmtCost(data.totalSpend)}
        sub={`vs $${fmt(data.lastMonthSpend)} last month`}
        icon={DollarSign}
        iconColor="text-blue-400"
        trend={data.spendChange}
      />

      <KPICard
        title="Tokens Used (MTD)"
        value={fmtTokens(data.totalTokens)}
        sub="prompt + completion"
        icon={Zap}
        iconColor="text-amber-400"
        glowClass=""
      />

      <KPICard
        title="Budget Remaining"
        value={fmtCost(Math.max(0, data.orgBudget - data.budgetUsed))}
        sub={`${budgetPct.toFixed(0)}% of $${fmt(data.orgBudget, 0)} used`}
        icon={Target}
        iconColor={budgetPct >= 90 ? "text-red-400" : "text-emerald-400"}
        glowClass={budgetPct >= 90 ? "glow-red" : "glow-green"}
      >
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", budgetColor)} style={{ width: `${budgetPct}%` }} />
        </div>
      </KPICard>

      <KPICard
        title="API Calls (MTD)"
        value={data.totalCalls.toLocaleString()}
        sub="total requests"
        icon={Activity}
        iconColor="text-purple-400"
        glowClass=""
      />

      <KPICard
        title="Avg Cost / Call"
        value={`$${data.avgCostPerCall.toFixed(4)}`}
        sub="mean per request"
        icon={BarChart3}
        iconColor="text-cyan-400"
        glowClass=""
      />

      <KPICard
        title="Active Agents"
        value={String(data.activeAgents)}
        sub="agents with calls this period"
        icon={Bot}
        iconColor="text-emerald-400"
        glowClass=""
      />

      <KPICard
        title="Most Expensive Agent"
        value={data.mostExpensiveAgent ? fmtCost(data.mostExpensiveAgent.cost) : "$0"}
        sub={data.mostExpensiveAgent?.name || "—"}
        icon={AlertTriangle}
        iconColor="text-amber-400"
        glowClass=""
      />

      <KPICard
        title="Projected Month-End"
        value={fmtCost(data.projectedSpend)}
        sub="based on daily burn rate"
        icon={Clock}
        iconColor={data.projectedSpend > data.orgBudget ? "text-red-400" : "text-blue-400"}
        glowClass={data.projectedSpend > data.orgBudget ? "glow-red" : ""}
      >
        {data.projectedSpend > data.orgBudget && (
          <span className="text-xs text-red-400 font-medium">Over budget forecast</span>
        )}
      </KPICard>
    </div>
  );
}
