"use client";

import { useEffect, useState } from "react";
import { Bot, Plus, Pencil, Trash2 } from "lucide-react";
import { AgentDetailModal } from "@/components/agent-detail-modal";
import { cn } from "@/lib/utils";

type Agent = {
  id: string;
  name: string;
  department: string;
  description: string | null;
  owner: string | null;
  primaryModel: string | null;
  budgetLimit: number;
  isActive: boolean;
  createdAt: string;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", department: "", description: "", owner: "", primaryModel: "", budgetLimit: 500 });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/agents");
    const data = await res.json();
    setAgents(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function createAgent() {
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", department: "", description: "", owner: "", primaryModel: "", budgetLimit: 500 });
    load();
  }

  async function deleteAgent(id: string) {
    if (!confirm("Delete this agent?")) return;
    await fetch(`/api/agents/${id}`, { method: "DELETE" });
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Agents</h1>
          <p className="text-sm text-slate-500">Manage AI agents and their configurations</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Agent
        </button>
      </div>

      {showForm && (
        <div className="card-dark rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">New Agent</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "name", label: "Name", placeholder: "MyAgent" },
              { key: "department", label: "Department", placeholder: "Engineering" },
              { key: "owner", label: "Owner", placeholder: "Jane Doe" },
              { key: "primaryModel", label: "Primary Model", placeholder: "gpt-4o" },
              { key: "description", label: "Description", placeholder: "What does this agent do?" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className={key === "description" ? "col-span-2" : ""}>
                <label className="block text-xs text-slate-500 mb-1">{label}</label>
                <input
                  value={(form as Record<string, string | number>)[key] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monthly Budget ($)</label>
              <input
                type="number"
                value={form.budgetLimit}
                onChange={(e) => setForm({ ...form, budgetLimit: parseFloat(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createAgent} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-500 animate-pulse">Loading agents…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="card-dark rounded-xl p-4 hover:border-slate-600/60 transition-colors cursor-pointer group"
              onClick={() => setSelectedId(agent.id)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{agent.name}</p>
                    <p className="text-xs text-slate-500">{agent.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {agent.description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{agent.description}</p>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500">{agent.primaryModel || "—"}</span>
                <span className="text-slate-500">Budget: ${agent.budgetLimit.toLocaleString()}/mo</span>
              </div>
              {agent.owner && (
                <p className="text-[10px] text-slate-600 mt-2">Owner: {agent.owner}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedId && <AgentDetailModal agentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
