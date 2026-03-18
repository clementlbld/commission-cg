import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "CLOSER") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { clientName, notes, installments, setterId } = body;

  if (!clientName || !installments?.length) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  const totalAmount = installments.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);

  const deal = await prisma.deal.create({
    data: {
      clientName,
      notes,
      totalAmount,
      closerId: session.user.id,
      setterId: setterId || undefined,
      installments: {
        create: installments.map((inst: { dueDate: string; amount: number }, idx: number) => ({
          installmentNumber: idx + 1,
          dueDate: new Date(inst.dueDate),
          expectedAmount: inst.amount,
          status: "PENDING",
        })),
      },
    },
  });

  return NextResponse.json(deal, { status: 201 });
}
