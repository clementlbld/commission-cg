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
