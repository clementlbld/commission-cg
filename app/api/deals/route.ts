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
  const { clientName, clientPhone, clientEmail, clientAddress, notes, installments, setterId, closedAt } = body;

  if (!clientName || !installments?.length) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  const totalAmount = installments.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);

  const setter = setterId ? await prisma.user.findUnique({ where: { id: setterId }, select: { name: true } }) : null;

  const deal = await prisma.deal.create({
    data: {
      clientName,
      clientPhone: clientPhone || undefined,
      clientEmail: clientEmail || undefined,
      clientAddress: clientAddress || undefined,
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

  const mensualitesLines = installments.map((inst: { dueDate: string; amount: number }, idx: number) => {
    const date = new Date(inst.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const montant = inst.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
    return `  ${idx + 1}. ${date} — ${montant}`;
  });

  const totalAmount2 = totalAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

  const message = [
    `🎯 *Nouveau deal signé !*`,
    ``,
    `Closeur : ${session.user.name}`,
    `Setter : ${setter?.name ?? "—"}`,
    ``,
    `Nom client : ${clientName}`,
    `Téléphone client : ${clientPhone || "—"}`,
    `Email : ${clientEmail || "—"}`,
    `Adresse client : ${clientAddress || "—"}`,
    ``,
    `💰 Mensualités (total : ${totalAmount2}) :`,
    ...mensualitesLines,
  ].join("\n");

  await sendWhatsAppNotification(message);

  return NextResponse.json(deal, { status: 201 });
}
