import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { apiCalls: true } },
      },
    });
    return NextResponse.json(agents);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agent = await prisma.agent.create({
      data: {
        name: body.name,
        department: body.department,
        description: body.description,
        owner: body.owner,
        primaryModel: body.primaryModel,
        budgetLimit: body.budgetLimit ?? 500,
      },
    });
    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
