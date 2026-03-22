import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function sendWhatsAppNotification(message: string) {
  const instance = process.env.GREENAPI_INSTANCE;
  const token = process.env.GREENAPI_TOKEN;
  const groupId = process.env.WHATSAPP_GROUP_ID;
  if (!instance || !token || !groupId) return;

  try {
    await fetch(`https://api.green-api.com/waInstance${instance}/sendMessage/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: groupId, message }),
    });
  } catch {
    // Ne pas bloquer la création du deal si WhatsApp échoue
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "CLOSER") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { clientName, notes, installments, setterId, closedAt } = body;

  if (!clientName || !installments?.length) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  const totalAmount = installments.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);

  const setter = setterId ? await prisma.user.findUnique({ where: { id: setterId }, select: { name: true } }) : null;

  const deal = await prisma.deal.create({
    data: {
      clientName,
      notes,
      totalAmount,
      closerId: session.user.id,
      setterId: setterId || undefined,
      closedAt: closedAt ? new Date(closedAt) : new Date(),
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

  const montant = totalAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const message = [
    `🎯 *Nouveau deal signé !*`,
    `👤 Client : ${clientName}`,
    `💰 Montant : ${montant}`,
    `📞 Closer : ${session.user.name}`,
    setter ? `🔗 Setter : ${setter.name}` : null,
    notes ? `📝 Notes : ${notes}` : null,
  ].filter(Boolean).join("\n");

  await sendWhatsAppNotification(message);

  return NextResponse.json(deal, { status: 201 });
}
