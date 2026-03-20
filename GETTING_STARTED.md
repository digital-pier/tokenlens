# Getting Started with TokenLens

Welcome! This guide is written for anyone connecting an AI-powered app to TokenLens for the first time — no prior experience required.

---

## What is TokenLens?

When your app talks to an AI model (like Claude or ChatGPT), the AI provider charges you based on how much text goes in and comes back out. That usage is measured in **tokens** — roughly 1 token per word.

TokenLens sits in the middle of that conversation and keeps track of everything:

- How many tokens each call used
- What it cost
- Which AI model was called
- How long the AI took to respond
- Whether any calls failed

You get a dashboard that shows all of this across your apps and teams, so you're never surprised by your AI bill.

```
Without TokenLens:     Your App  →  AI Provider
With TokenLens:        Your App  →  TokenLens  →  AI Provider
                                         ↓
                                     Dashboard
```

Your app's requests still go to the AI provider — TokenLens just watches them on the way through and records the details.

---

## Before You Start

You'll need:

- **Node.js 18 or later** installed on your machine ([download here](https://nodejs.org))
- **Git** to clone the repository
- An app that makes calls to an AI provider (Claude, OpenAI, etc.)
- Your **AI provider API key** (e.g. your Anthropic key starting with `sk-ant-...`)

To check if Node.js is installed, open a terminal and run:
```bash
node --version
```
You should see something like `v20.11.0`. If you get an error, install Node.js first.

---

## Step 1: Install TokenLens

Open a terminal and run these commands one at a time:

```bash
# 1. Download the TokenLens code
git clone <your-tokenlens-repo-url>
cd tokenlens

# 2. Install dependencies
npm install

# 3. Set up the database
npx prisma migrate dev --name init
npx prisma generate

# 4. Start the app
npm run dev
```

Once running, open your browser and go to:

```
http://localhost:3000
```

You should see the TokenLens dashboard. It will be empty — that's expected. Let's fix that next.

---

## Step 2: Try the Demo Data (Optional)

If you want to see what a populated dashboard looks like before connecting your own app, click the **"Seed Demo Data"** button on the dashboard.

This loads 90 days of simulated data from 12 fictional AI agents across different departments. It's a great way to explore the charts and reports before using real data. You can clear this later.

---

## Step 3: Connect Your App

This is the key step. Instead of your app calling the AI provider directly, you point it at TokenLens first.

**You only need to change one thing: the API base URL.**

TokenLens listens at:
```
http://localhost:3000/api/proxy/llm
```

You also add a few extra headers to identify your app. These show up as the agent name in the dashboard.

---

### If Your App Uses Claude (Anthropic)

**Using the Anthropic JavaScript/TypeScript SDK:**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: "http://localhost:3000/api/proxy/llm",
  defaultHeaders: {
    "x-agent-id":   "my-app-001",         // A unique ID for your app
    "x-agent-name": "My Claude App",      // The name shown in the dashboard
    "x-department": "Engineering",        // Your team or department
    "x-api-key":    process.env.ANTHROPIC_API_KEY!,
  },
});

// Everything else stays exactly the same
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }],
});
```

**Using Python:**

```python
import anthropic

client = anthropic.Anthropic(
    api_key="sk-ant-your-key",
    base_url="http://localhost:3000/api/proxy/llm",
    default_headers={
        "x-agent-id":   "my-app-001",
        "x-agent-name": "My Claude App",
        "x-department": "Engineering",
        "x-api-key":    "sk-ant-your-key",
    }
)

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

**Using curl (to test it's working):**

```bash
curl -X POST http://localhost:3000/api/proxy/llm \
  -H "Content-Type: application/json" \
  -H "x-agent-id: my-app-001" \
  -H "x-agent-name: My Claude App" \
  -H "x-department: Engineering" \
  -H "x-api-key: sk-ant-your-key-here" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 256,
    "messages": [{"role": "user", "content": "Say hello!"}]
  }'
```

---

### If Your App Uses OpenAI (ChatGPT)

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "http://localhost:3000/api/proxy/llm",
  defaultHeaders: {
    "x-agent-id":   "my-app-001",
    "x-agent-name": "My OpenAI App",
    "x-department": "Engineering",
    "x-provider":   "openai",
  },
});
```

---

### Understanding the Headers

| Header | What it does | Example |
|---|---|---|
| `x-agent-id` | A unique ID for your app. Use any string — it won't change. | `"my-app-001"` |
| `x-agent-name` | The display name shown in the TokenLens dashboard | `"Customer Support Bot"` |
| `x-department` | Groups your apps by team in reports | `"Engineering"`, `"Sales"` |
| `x-api-key` | Your Anthropic API key (required for Claude) | `"sk-ant-..."` |
| `x-provider` | The AI provider (only needed if not using Claude) | `"openai"`, `"groq"` |

> **Your API key stays private.** It's sent directly from your machine to Anthropic — TokenLens forwards it but never stores it.

---

## Step 4: Make a Call and Check the Dashboard

1. Run your app and trigger an AI call
2. Go back to `http://localhost:3000/dashboard`
3. Your app should now appear as an agent with usage data

If you connected multiple apps or have multiple teams, each one shows up separately based on the `x-agent-id` you provided.

---

## What You Can See in the Dashboard

**Dashboard** (`/dashboard`)
- Total spend, number of calls, average cost per call
- Daily spend chart broken down by provider
- A table of all your agents ranked by cost
- A live feed of recent AI calls

**Agents** (`/agents`)
- Details for each connected app: total cost, token usage, error rate
- Set a monthly budget per agent — TokenLens will warn you when you're close

**Providers** (`/providers`)
- Usage and cost breakdown by AI provider (Anthropic, OpenAI, etc.)
- A reference table showing current pricing per million tokens for all supported models

**Reports** (`/reports`)
- Export your usage data as a CSV file for billing or analysis

**Settings** (`/settings`)
- Set an organisation-wide monthly budget
- Configure alert thresholds (e.g. warn at 70%, block at 100%)
- Set an email address for budget alerts

---

## Troubleshooting

**"My agent isn't appearing in the dashboard"**
- Make sure TokenLens is running (`npm run dev` in the tokenlens folder)
- Check that your base URL is exactly `http://localhost:3000/api/proxy/llm`
- Make sure you included the `x-agent-id` header

**"I'm getting an authentication error"**
- For Claude: confirm you passed `x-api-key` with your Anthropic key
- For OpenAI: confirm you passed `Authorization: Bearer sk-your-key`

**"The call succeeded but I see $0.00 cost"**
- The model name in your request may not match a known pricing entry
- Check the Providers page — if your model is listed there, costs will calculate correctly
- You can add custom models in `lib/pricing/index.ts`

**"I want to track multiple apps separately"**
- Use a different `x-agent-id` for each app (e.g. `"app-prod"`, `"app-staging"`, `"chatbot-v2"`)
- Each ID creates a separate agent entry in the dashboard

---

## Next Steps

- Set up budgets on the **Agents** page to avoid surprise bills
- Use the **Reports** page to export data for your finance team
- If you have multiple apps or teams, give each a descriptive `x-agent-name` and `x-department`
- For production use, change `http://localhost:3000` to wherever you've deployed TokenLens
