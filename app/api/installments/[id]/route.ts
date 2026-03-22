import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const installment = await prisma.installment.update({
    where: { id },
    data: {
      paidAmount: paidAmount != null ? parseFloat(paidAmount) : undefined,
      status,
      comment,
      paidAt: status === "PAID" || status === "PARTIAL" ? new Date() : null,
      validatedById: session.user.id,
    },
  });

  return NextResponse.json(installment);
}
