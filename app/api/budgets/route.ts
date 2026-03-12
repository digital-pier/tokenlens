import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";

export async function GET() {
  const budgets = await prisma.budget.findMany({
    include: { agent: { select: { name: true, department: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(budgets);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date();
    const month = body.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Upsert existing budget for same entity+month
    const existing = await prisma.budget.findFirst({
      where: {
        type: body.type,
        agentId: body.agentId || null,
        department: body.department || null,
        month,
      },
    });

    const budget = existing
      ? await prisma.budget.update({
          where: { id: existing.id },
          data: { monthlyLimit: body.monthlyLimit, warnAt: body.warnAt, criticalAt: body.criticalAt, blockAt: body.blockAt },
        })
      : await prisma.budget.create({
          data: {
            type: body.type,
            agentId: body.agentId || null,
            department: body.department || null,
            monthlyLimit: body.monthlyLimit,
            warnAt: body.warnAt ?? 0.7,
            criticalAt: body.criticalAt ?? 0.9,
            blockAt: body.blockAt ?? 1.0,
            month,
          },
        });

    await prisma.auditLog.create({
      data: {
        action: existing ? "UPDATE_BUDGET" : "CREATE_BUDGET",
        entity: "Budget",
        entityId: budget.id,
        newValue: JSON.stringify(budget),
        note: body.note,
      },
    });

    return NextResponse.json(budget);
  } catch (err) {
    return NextResponse.json({ error: "Failed to save budget", details: String(err) }, { status: 500 });
  }
}
