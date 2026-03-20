import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const agent = await prisma.agent.findUnique({
      where: { id },
    });
    if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(agent);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        name: body.name,
        department: body.department,
        description: body.description,
        owner: body.owner,
        primaryModel: body.primaryModel,
        budgetLimit: body.budgetLimit,
        isActive: body.isActive,
      },
    });
    return NextResponse.json(agent);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.agent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}
