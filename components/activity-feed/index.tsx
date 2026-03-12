"use client";

import { format } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import { getProviderColor } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type ApiCall = {
  id: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: number;
  latencyMs: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
  agent: { name: string; department: string };
};

function fmtCost(n: number) {
  if (n < 0.001) return `<$0.001`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function fmtTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function ActivityFeed({ calls }: { calls: ApiCall[] }) {
  return (
    <div className="card-dark rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Recent Activity</h3>
        <span className="text-xs text-slate-600">Last 50 calls</span>
      </div>
      <div className="overflow-y-auto max-h-80">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-950/90 backdrop-blur z-10">
            <tr className="border-b border-slate-800/60">
              <th className="px-4 py-2 text-left text-slate-500 uppercase tracking-wider font-medium">Time</th>
              <th className="px-4 py-2 text-left text-slate-500 uppercase tracking-wider font-medium">Agent</th>
              <th className="px-4 py-2 text-left text-slate-500 uppercase tracking-wider font-medium">Model</th>
              <th className="px-4 py-2 text-right text-slate-500 uppercase tracking-wider font-medium">Tokens</th>
              <th className="px-4 py-2 text-right text-slate-500 uppercase tracking-wider font-medium">Cost</th>
              <th className="px-4 py-2 text-right text-slate-500 uppercase tracking-wider font-medium">Latency</th>
              <th className="px-4 py-2 text-center text-slate-500 uppercase tracking-wider font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id} className="border-b border-slate-800/20 hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-2 text-slate-500 font-mono whitespace-nowrap">
                  {format(new Date(call.createdAt), "HH:mm:ss")}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span className="text-slate-200">{call.agent.name}</span>
                    <span className="text-slate-600 text-[10px]">{call.agent.department}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span
                    className="font-mono text-[11px] px-1.5 py-0.5 rounded"
                    style={{
                      color: getProviderColor(call.provider),
                      background: `${getProviderColor(call.provider)}18`,
                      border: `1px solid ${getProviderColor(call.provider)}30`,
                    }}
                  >
                    {call.model.length > 20 ? call.model.slice(0, 20) + "…" : call.model}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">{fmtTokens(call.totalTokens)}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-300">{fmtCost(call.totalCost)}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">{call.latencyMs}ms</td>
                <td className="px-4 py-2 text-center">
                  {call.success
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />
                    : (
                      <span title={call.errorMessage || "Error"}>
                        <XCircle className="w-3.5 h-3.5 text-red-500 inline" />
                      </span>
                    )
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
