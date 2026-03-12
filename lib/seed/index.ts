import prisma from "@/lib/prisma/client";
import { calculateCost, detectProvider } from "@/lib/pricing";

const AGENTS = [
  {
    name: "CustomerSupportBot",
    department: "Support",
    description: "Handles customer inquiries, ticket routing, and first-response automation",
    owner: "Sarah Chen",
    primaryModel: "gpt-3.5-turbo",
    budgetLimit: 800,
    volume: "high",
    errorRate: 0.02,
  },
  {
    name: "ContractReviewer",
    department: "Legal",
    description: "Reviews and summarizes legal contracts, flags risk clauses",
    owner: "Marcus Webb",
    primaryModel: "gpt-4o",
    budgetLimit: 500,
    volume: "low",
    errorRate: 0.01,
  },
  {
    name: "CodeAssistant",
    department: "Engineering",
    description: "Code review, debugging assistance, and documentation generation",
    owner: "Priya Sharma",
    primaryModel: "claude-3-5-sonnet-20241022",
    budgetLimit: 1200,
    volume: "high",
    errorRate: 0.03,
  },
  {
    name: "SalesEmailDrafter",
    department: "Sales",
    description: "Drafts personalized outreach emails and follow-up sequences",
    owner: "Jake Torres",
    primaryModel: "gpt-4o-mini",
    budgetLimit: 400,
    volume: "medium",
    errorRate: 0.015,
  },
  {
    name: "FraudDetector",
    department: "Finance",
    description: "Analyzes transactions in real-time for fraud patterns and anomalies",
    owner: "Diana Park",
    primaryModel: "claude-3-haiku-20240307",
    budgetLimit: 2000,
    volume: "very_high",
    errorRate: 0.005,
  },
  {
    name: "MarketingCopyAgent",
    department: "Marketing",
    description: "Generates ad copy, blog posts, social media content and A/B variants",
    owner: "Leo Martinez",
    primaryModel: "gpt-4o",
    budgetLimit: 600,
    volume: "medium",
    errorRate: 0.02,
  },
  {
    name: "DataSummaryBot",
    department: "Analytics",
    description: "Summarizes data reports, generates insights from CSV/SQL query results",
    owner: "Nadia Fischer",
    primaryModel: "gemini-1.5-flash",
    budgetLimit: 900,
    volume: "high",
    errorRate: 0.04,
  },
  {
    name: "HRPolicyAssistant",
    department: "HR",
    description: "Answers employee questions about policies, benefits, and procedures",
    owner: "Tom Bradley",
    primaryModel: "claude-3-5-sonnet-20241022",
    budgetLimit: 300,
    volume: "low",
    errorRate: 0.01,
  },
  {
    name: "InventoryOptimizer",
    department: "Operations",
    description: "Analyzes inventory levels, predicts reorder points, suggests optimizations",
    owner: "Aisha Okonkwo",
    primaryModel: "mistral-large-latest",
    budgetLimit: 700,
    volume: "medium",
    errorRate: 0.025,
  },
  {
    name: "ResearchSynthesizer",
    department: "R&D",
    description: "Synthesizes academic papers, competitive intelligence, and market research",
    owner: "Dr. James Liu",
    primaryModel: "claude-opus-4-6",
    budgetLimit: 400,
    volume: "low",
    errorRate: 0.01,
  },
  {
    name: "OnboardingGuide",
    department: "HR",
    description: "Guides new employees through onboarding tasks, answers FAQ",
    owner: "Rachel Kim",
    primaryModel: "gpt-3.5-turbo",
    budgetLimit: 350,
    volume: "medium",
    errorRate: 0.02,
  },
  {
    name: "ExecutiveBriefing",
    department: "Leadership",
    description: "Produces executive summaries, board-level reports, and strategic digests",
    owner: "CEO Office",
    primaryModel: "gpt-4o",
    budgetLimit: 300,
    volume: "low",
    errorRate: 0.005,
  },
];

const VOLUME_CALLS_PER_DAY: Record<string, { min: number; max: number }> = {
  very_high: { min: 200, max: 600 },
  high: { min: 80, max: 200 },
  medium: { min: 20, max: 80 },
  low: { min: 3, max: 20 },
};

const TOKEN_RANGES: Record<string, { prompt: { min: number; max: number }; completion: { min: number; max: number } }> = {
  "gpt-3.5-turbo": { prompt: { min: 100, max: 800 }, completion: { min: 50, max: 400 } },
  "gpt-4o": { prompt: { min: 500, max: 3000 }, completion: { min: 200, max: 1500 } },
  "gpt-4o-mini": { prompt: { min: 200, max: 1500 }, completion: { min: 100, max: 800 } },
  "gpt-4-turbo": { prompt: { min: 800, max: 5000 }, completion: { min: 300, max: 2000 } },
  "claude-3-5-sonnet-20241022": { prompt: { min: 400, max: 4000 }, completion: { min: 200, max: 2000 } },
  "claude-3-haiku-20240307": { prompt: { min: 50, max: 500 }, completion: { min: 30, max: 200 } },
  "claude-opus-4-6": { prompt: { min: 1000, max: 8000 }, completion: { min: 500, max: 4000 } },
  "gemini-1.5-flash": { prompt: { min: 200, max: 2000 }, completion: { min: 100, max: 1000 } },
  "mistral-large-latest": { prompt: { min: 300, max: 3000 }, completion: { min: 150, max: 1500 } },
};

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getWeekdayMultiplier(date: Date): number {
  const day = date.getDay();
  if (day === 0) return 0.15; // Sunday
  if (day === 6) return 0.25; // Saturday
  if (day === 1 || day === 5) return 0.7; // Mon/Fri
  return 1.0; // Tue-Thu
}

export async function seedDatabase() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.apiCall.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.agent.deleteMany();

  // Create agents
  const createdAgents = await Promise.all(
    AGENTS.map((a) =>
      prisma.agent.create({
        data: {
          name: a.name,
          department: a.department,
          description: a.description,
          owner: a.owner,
          primaryModel: a.primaryModel,
          budgetLimit: a.budgetLimit,
          isActive: true,
        },
      })
    )
  );

  console.log(`Created ${createdAgents.length} agents`);

  // Current month for budget
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Org-wide budget
  await prisma.budget.create({
    data: {
      type: "org",
      monthlyLimit: 8000,
      month: currentMonth,
    },
  });

  // Per-agent budgets
  for (let i = 0; i < createdAgents.length; i++) {
    await prisma.budget.create({
      data: {
        agentId: createdAgents[i].id,
        type: "agent",
        monthlyLimit: AGENTS[i].budgetLimit,
        month: currentMonth,
      },
    });
  }

  // Department budgets
  const departments = Array.from(new Set(AGENTS.map((a) => a.department)));
  const deptBudgets: Record<string, number> = {
    Support: 1000, Legal: 600, Engineering: 1500, Sales: 500,
    Finance: 2500, Marketing: 700, Analytics: 1100, HR: 700,
    Operations: 800, "R&D": 500, Leadership: 400,
  };
  for (const dept of departments) {
    await prisma.budget.create({
      data: {
        department: dept,
        type: "department",
        monthlyLimit: deptBudgets[dept] || 500,
        month: currentMonth,
      },
    });
  }

  // Generate 90 days of API calls
  const apiCalls: {
    agentId: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    latencyMs: number;
    success: boolean;
    errorMessage: string | null;
    requestMetadata: string | null;
    responseMetadata: string | null;
    createdAt: Date;
  }[] = [];

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 90);

  for (let d = 0; d < 90; d++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + d);
    const multiplier = getWeekdayMultiplier(date);

    for (let i = 0; i < createdAgents.length; i++) {
      const agent = createdAgents[i];
      const agentConfig = AGENTS[i];
      const volumeRange = VOLUME_CALLS_PER_DAY[agentConfig.volume];
      const baseCalls = randBetween(volumeRange.min, volumeRange.max);
      const callCount = Math.max(1, Math.floor(baseCalls * multiplier));

      const tokenRange = TOKEN_RANGES[agentConfig.primaryModel] || {
        prompt: { min: 200, max: 2000 },
        completion: { min: 100, max: 1000 },
      };

      for (let c = 0; c < callCount; c++) {
        const isError = Math.random() < agentConfig.errorRate;
        const hourOffset = randBetween(0, 86399);
        const callDate = new Date(date.getTime() + hourOffset * 1000);

        // Occasionally use a secondary model
        let model = agentConfig.primaryModel;
        if (Math.random() < 0.1) {
          const alternatives: Record<string, string[]> = {
            "gpt-3.5-turbo": ["gpt-4o-mini"],
            "gpt-4o": ["gpt-4-turbo", "gpt-4o-mini"],
            "claude-3-5-sonnet-20241022": ["claude-3-haiku-20240307", "claude-opus-4-6"],
            "claude-3-haiku-20240307": ["claude-3-5-sonnet-20241022"],
            "claude-opus-4-6": ["claude-3-5-sonnet-20241022"],
            "gemini-1.5-flash": ["gemini-1.5-pro"],
            "mistral-large-latest": ["mistral-small-latest"],
          };
          const alts = alternatives[agentConfig.primaryModel];
          if (alts) model = randomChoice(alts);
        }

        const provider = detectProvider(model);
        const promptTokens = isError ? randBetween(50, 200) : randBetween(tokenRange.prompt.min, tokenRange.prompt.max);
        const completionTokens = isError ? 0 : randBetween(tokenRange.completion.min, tokenRange.completion.max);
        const totalTokens = promptTokens + completionTokens;

        const { inputCost, outputCost, totalCost } = calculateCost(promptTokens, completionTokens, model, provider);
        const latencyMs = isError
          ? randBetween(50, 500)
          : randBetween(300, Math.min(15000, 300 + totalTokens * 2));

        apiCalls.push({
          agentId: agent.id,
          provider,
          model,
          promptTokens,
          completionTokens,
          totalTokens,
          inputCost,
          outputCost,
          totalCost,
          latencyMs,
          success: !isError,
          errorMessage: isError
            ? randomChoice([
                "Rate limit exceeded",
                "Context length exceeded",
                "Invalid API key",
                "Timeout after 30s",
                "Model overloaded, please retry",
                "Insufficient quota",
              ])
            : null,
          requestMetadata: JSON.stringify({ temperature: 0.7, max_tokens: completionTokens || 1024 }),
          responseMetadata: isError ? null : JSON.stringify({ finish_reason: "stop" }),
          createdAt: callDate,
        });
      }
    }
  }

  // Insert in batches of 500
  console.log(`Inserting ${apiCalls.length} API calls...`);
  const batchSize = 500;
  for (let i = 0; i < apiCalls.length; i += batchSize) {
    const batch = apiCalls.slice(i, i + batchSize);
    await prisma.apiCall.createMany({ data: batch });
    if (i % 5000 === 0) console.log(`  ${i}/${apiCalls.length}...`);
  }

  // Default settings
  await prisma.settings.createMany({
    data: [
      { key: "org_budget", value: "8000" },
      { key: "org_name", value: "Acme Corp" },
      { key: "alert_email", value: "cfo@acme.com" },
      { key: "data_retention_days", value: "365" },
      { key: "warn_threshold", value: "0.7" },
      { key: "critical_threshold", value: "0.9" },
      { key: "block_threshold", value: "1.0" },
    ],
  });

  console.log("Seed complete!");
  return { agents: createdAgents.length, calls: apiCalls.length };
}
