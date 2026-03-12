"use client";

import { useState } from "react";
import { Download, FileText, Calendar } from "lucide-react";

export default function ReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  function download(type: string) {
    window.open(`/api/reports?type=${type}&from=${from}&to=${to}`, "_blank");
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Reports & Export</h1>
        <p className="text-sm text-slate-500">Export data and generate executive summaries</p>
      </div>

      {/* Date range */}
      <div className="card-dark rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Date Range
        </h3>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Export options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-dark rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Full Call Log</h3>
              <p className="text-xs text-slate-500">Every API call with full metadata</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Includes: timestamp, agent, department, provider, model, tokens, costs, latency, errors
          </p>
          <button
            onClick={() => download("calls")}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg hover:bg-emerald-600/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        <div className="card-dark rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Agent Summary</h3>
              <p className="text-xs text-slate-500">Aggregated per-agent statistics</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Includes: agent name, department, total calls, tokens, cost, avg latency, budget
          </p>
          <button
            onClick={() => download("agents")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/20 text-blue-400 text-sm rounded-lg hover:bg-blue-600/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* CFO summary instructions */}
      <div className="card-dark rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">CFO Monthly Summary</h3>
        <p className="text-sm text-slate-500">
          To generate an AI-powered executive summary, use the Claude API with the call log export above as context.
          Route the request through the TokenLens proxy:
        </p>
        <pre className="bg-slate-900 border border-slate-700/60 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto">
{`curl -X POST http://localhost:3000/api/proxy/llm \\
  -H "Content-Type: application/json" \\
  -H "X-Agent-ID: cfo-report-gen" \\
  -H "X-Agent-Name: CFOReportGenerator" \\
  -H "X-Department: Leadership" \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "X-Provider: anthropic" \\
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "messages": [{
      "role": "user",
      "content": "Generate a 3-paragraph CFO summary of our LLM spending for this month. Top 3 cost drivers, budget status, recommendations."
    }]
  }'`}
        </pre>
      </div>
    </div>
  );
}
