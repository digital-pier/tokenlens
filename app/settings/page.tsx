"use client";

import { useEffect, useState } from "react";
import { Save, AlertTriangle, Shield, Database, Bell } from "lucide-react";

type Settings = {
  org_name?: string;
  org_budget?: string;
  alert_email?: string;
  data_retention_days?: string;
  warn_threshold?: string;
  critical_threshold?: string;
  block_threshold?: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { setSettings(d); setLoading(false); });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function field(key: keyof Settings, label: string, type = "text", placeholder = "") {
    return (
      <div>
        <label className="block text-xs text-slate-500 mb-1">{label}</label>
        <input
          type={type}
          value={settings[key] || ""}
          onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-500">Configure TokenLens for your organization</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saved ? "Saved!" : saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 animate-pulse">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Organization */}
          <div className="card-dark rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Organization</h3>
            </div>
            {field("org_name", "Organization Name", "text", "Acme Corp")}
            {field("org_budget", "Monthly Budget ($)", "number", "8000")}
          </div>

          {/* Alerts */}
          <div className="card-dark rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Alerts</h3>
            </div>
            {field("alert_email", "Alert Email", "email", "cfo@company.com")}
            {field("warn_threshold", "Warn Threshold (0-1)", "number", "0.7")}
            {field("critical_threshold", "Critical Threshold (0-1)", "number", "0.9")}
            {field("block_threshold", "Block Threshold (0-1)", "number", "1.0")}
          </div>

          {/* Data retention */}
          <div className="card-dark rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Data Retention</h3>
            </div>
            {field("data_retention_days", "Retain Data (days)", "number", "365")}
            <p className="text-xs text-slate-600">API call logs older than this many days will be purged.</p>
          </div>

          {/* Proxy instructions */}
          <div className="card-dark rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Proxy Endpoint</h3>
            </div>
            <p className="text-xs text-slate-500">
              Route all LLM API calls through this endpoint to automatically capture cost data:
            </p>
            <code className="block bg-slate-900 border border-slate-700/60 rounded-lg p-3 text-xs text-blue-300 font-mono">
              POST http://localhost:3000/api/proxy/llm
            </code>
            <div className="space-y-1.5 text-xs text-slate-500">
              <p><span className="text-slate-400 font-mono">X-Agent-ID</span> — Unique identifier for the agent</p>
              <p><span className="text-slate-400 font-mono">X-Agent-Name</span> — Human-readable agent name</p>
              <p><span className="text-slate-400 font-mono">X-Department</span> — Department for cost allocation</p>
              <p><span className="text-slate-400 font-mono">X-Provider</span> — openai | anthropic | google | mistral</p>
              <p><span className="text-slate-400 font-mono">x-api-key</span> — Your LLM provider API key</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
