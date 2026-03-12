# TokenLens — LLM Token & Cost Intelligence Dashboard

CFO-grade financial oversight for all LLM API spending across your organization.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: SQLite via Prisma ORM v7 + better-sqlite3 adapter
- **Charts**: Recharts
- **UI**: shadcn/ui components
- **Proxy**: Universal LLM proxy endpoint

---

## Setup

### 1. Install dependencies

```bash
cd tokenlens
npm install
```

### 2. Initialize the database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to the dashboard.

---

## Seeding Demo Data

To populate 90 days of realistic data with 12 AI agents:

**Option A — via the UI:**
Click the **"Seed Demo Data"** button on the dashboard.

**Option B — via API:**
```bash
curl -X POST http://localhost:3000/api/seed
```

This creates:
- 12 AI agents across 11 departments
- ~66,000 API call records spanning 90 days
- Realistic weekday/weekend usage patterns
- Occasional error entries
- Per-agent, per-department, and org-wide budgets

---

## Routing an Existing AI Agent Through the Proxy

Change your agent's API base URL to the TokenLens proxy endpoint and add headers:

### OpenAI Example

```python
import openai

client = openai.OpenAI(
    base_url="http://localhost:3000/api/proxy/llm",
    api_key="sk-your-openai-key",
    default_headers={
        "X-Agent-ID": "my-agent-001",
        "X-Agent-Name": "MyProductionAgent",
        "X-Department": "Engineering",
        "X-Provider": "openai",
    }
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Anthropic Example

```python
import httpx

response = httpx.post(
    "http://localhost:3000/api/proxy/llm",
    headers={
        "Content-Type": "application/json",
        "X-Agent-ID": "contract-reviewer-v2",
        "X-Agent-Name": "ContractReviewer",
        "X-Department": "Legal",
        "X-Provider": "anthropic",
        "x-api-key": "sk-ant-your-key",
    },
    json={
        "model": "claude-sonnet-4-6",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": "Review this contract..."}]
    }
)
```

---

## Example curl Commands

### OpenAI-compatible call (GPT-4o):

```bash
curl -X POST http://localhost:3000/api/proxy/llm \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: my-bot-001" \
  -H "X-Agent-Name: MyBot" \
  -H "X-Department: Engineering" \
  -H "X-Provider: openai" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Summarize the key risks in Q3."}
    ],
    "max_tokens": 512
  }'
```

### Anthropic call (Claude):

```bash
curl -X POST http://localhost:3000/api/proxy/llm \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: research-bot" \
  -H "X-Agent-Name: ResearchSynthesizer" \
  -H "X-Department: R&D" \
  -H "X-Provider: anthropic" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Synthesize the latest research on..."}
    ]
  }'
```

The proxy appends a `_tokenlens` field to every response:
```json
{
  "...normal response...",
  "_tokenlens": {
    "promptTokens": 42,
    "completionTokens": 187,
    "totalTokens": 229,
    "latencyMs": 1243,
    "provider": "anthropic",
    "model": "claude-sonnet-4-6"
  }
}
```

---

## Adding a New LLM Provider

**Step 1** — Add pricing in `lib/pricing/index.ts`:

```typescript
{ provider: "myprovider", model: "my-model-v1", inputPer1M: 1.50, outputPer1M: 6.00, contextWindow: 128000 },
```

**Step 2** — Add provider detection in `detectProvider()` in the same file:

```typescript
if (m.includes("myprovider") || m.startsWith("my-model")) return "myprovider";
```

**Step 3** — Add the endpoint in `app/api/proxy/llm/route.ts`:

```typescript
const PROVIDER_ENDPOINTS: Record<string, string> = {
  myprovider: "https://api.myprovider.com/v1/chat/completions",
  // ...existing entries
};
```

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `POST /api/proxy/llm` | POST | Universal LLM proxy |
| `GET /api/metrics` | GET | Aggregate dashboard metrics |
| `GET /api/metrics/agent/[id]` | GET | Per-agent detailed metrics |
| `GET/POST /api/agents` | GET/POST | List / create agents |
| `GET/PATCH/DELETE /api/agents/[id]` | * | Agent CRUD |
| `GET/POST /api/budgets` | GET/POST | Budget management |
| `GET /api/reports?type=calls` | GET | Export call log as CSV |
| `GET /api/reports?type=agents` | GET | Export agent summary as CSV |
| `GET/POST /api/settings` | GET/POST | App configuration |
| `POST /api/seed` | POST | Populate demo data |

### Date range filtering (all metrics endpoints):
- `?from=2025-01-01` — start date (defaults to current month start)
- `?to=2025-01-31` — end date (defaults to now)

---

## Required Proxy Headers

| Header | Description |
|---|---|
| `X-Agent-ID` | Unique agent identifier |
| `X-Agent-Name` | Human-readable name (auto-creates agent if new) |
| `X-Department` | Department for cost allocation |
| `X-Provider` | Force provider: openai, anthropic, google, mistral, cohere, groq |
| `Authorization: Bearer <key>` | API key for OpenAI, Groq, Mistral, Cohere |
| `x-api-key: <key>` | API key for Anthropic |

---

## Project Structure

```
tokenlens/
├── app/
│   ├── dashboard/         Main CFO dashboard (KPIs, charts, agent table, activity feed)
│   ├── agents/            Agent management & creation
│   ├── providers/         Provider analytics & full pricing table
│   ├── reports/           CSV export & report generation
│   ├── settings/          Configuration & proxy documentation
│   └── api/
│       ├── proxy/llm/     Universal LLM proxy endpoint
│       ├── agents/        Agent CRUD
│       ├── metrics/       Dashboard & agent-level metrics
│       ├── reports/       CSV export
│       ├── budgets/       Budget management
│       ├── settings/      App settings
│       └── seed/          Demo data generator
├── components/
│   ├── sidebar.tsx                Navigation sidebar
│   ├── kpi-cards/                 8 CFO KPI metric cards
│   ├── charts/                    Daily spend, dept pie, model bar, provider bar
│   ├── agent-table/               Sortable agent leaderboard with sparklines
│   ├── activity-feed/             Recent API call feed (last 50)
│   └── agent-detail-modal/        Agent drill-down drawer with full analytics
└── lib/
    ├── prisma/client.ts            Prisma v7 + better-sqlite3 adapter
    ├── pricing/index.ts            35+ model pricing table + cost calculator
    ├── proxy/index.ts              LLM proxy logic + budget alerts
    └── seed/index.ts               90-day realistic demo data generator
```
