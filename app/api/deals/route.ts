import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";

async function sendWhatsAppNotification(message: string) {
  const instance = process.env.GREENAPI_INSTANCE;
  const token = process.env.GREENAPI_TOKEN;
  const groupId = process.env.WHATSAPP_GROUP_ID;
  if (!instance || !token || !groupId) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(`https://api.green-api.com/waInstance${instance}/sendMessage/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: groupId, message }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch {
    // Ne pas bloquer la création du deal si WhatsApp échoue
  }
}

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Requête non autorisée" }, { status: 403 });
  }

  const session = await auth();
  if (!session || session.user.role !== "CLOSER") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!rateLimit(`deals:${session.user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const body = await req.json();
  const { clientName, clientPhone, clientEmail, clientAddress, notes, installments, setterId, closedAt } = body;

  if (!clientName || !installments?.length) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  if (typeof clientName !== "string" || clientName.length > 200) {
    return NextResponse.json({ error: "Nom client invalide (max 200 caractères)" }, { status: 400 });
  }
  if (notes && (typeof notes !== "string" || notes.length > 1000)) {
    return NextResponse.json({ error: "Notes invalides (max 1000 caractères)" }, { status: 400 });
  }
  if (clientPhone && (typeof clientPhone !== "string" || clientPhone.length > 200)) {
    return NextResponse.json({ error: "Téléphone invalide (max 200 caractères)" }, { status: 400 });
  }
  if (clientEmail && (typeof clientEmail !== "string" || clientEmail.length > 200)) {
    return NextResponse.json({ error: "Email invalide (max 200 caractères)" }, { status: 400 });
  }
  if (clientAddress && (typeof clientAddress !== "string" || clientAddress.length > 200)) {
    return NextResponse.json({ error: "Adresse invalide (max 200 caractères)" }, { status: 400 });
  }
  if (!Array.isArray(installments) || installments.length > 60) {
    return NextResponse.json({ error: "Nombre de mensualités invalide (max 60)" }, { status: 400 });
  }
  for (const inst of installments) {
    if (typeof inst.amount !== "number" || inst.amount <= 0 || inst.amount >= 1_000_000) {
      return NextResponse.json({ error: "Montant de mensualité invalide (doit être > 0 et < 1 000 000)" }, { status: 400 });
    }
  }

  const totalAmount = installments.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);

  let setter: { name: true; role: true } extends infer T ? { name: string; role: string } | null : never = null;
  if (setterId) {
    const found = await prisma.user.findUnique({ where: { id: setterId }, select: { name: true, role: true } });
    if (!found || found.role !== "SETTER") {
      return NextResponse.json({ error: "Setter invalide" }, { status: 400 });
    }
    setter = found;
  }

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
