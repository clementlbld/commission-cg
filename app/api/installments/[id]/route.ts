import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Requête non autorisée" }, { status: 403 });
  }

  const session = await auth();
  if (!session || session.user.role !== "COMPTA") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { paidAmount, status, comment } = body;

  const VALID_STATUSES = ["PENDING", "PAID", "PARTIAL", "DEFERRED"];
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  if (paidAmount != null && (isNaN(parseFloat(paidAmount)) || parseFloat(paidAmount) < 0)) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  if (comment && (typeof comment !== "string" || comment.length > 500)) {
    return NextResponse.json({ error: "Commentaire trop long (max 500 caractères)" }, { status: 400 });
  }

  const isPaid = status === "PAID" || status === "PARTIAL";

  try {
    const installment = await prisma.installment.update({
      where: { id },
      data: {
        paidAmount: isPaid ? (paidAmount != null ? parseFloat(paidAmount) : undefined) : null,
        status,
        comment,
        paidAt: isPaid ? new Date() : null,
        validatedById: session.user.id,
      },
    });

    return NextResponse.json(installment);
  } catch {
    return NextResponse.json({ error: "Mensualité introuvable" }, { status: 404 });
  }
}
