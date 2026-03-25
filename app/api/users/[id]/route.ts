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
  const { commissionRate } = await req.json();

  const rate = parseFloat(commissionRate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    return NextResponse.json({ error: "Taux de commission invalide (0-100)" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { commissionRate: rate },
      select: { id: true, name: true, email: true, role: true, commissionRate: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
}

export async function DELETE(
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

  if (id === session.user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
  }

  const dealCount = await prisma.deal.count({
    where: { OR: [{ closerId: id }, { setterId: id }] },
  });

  if (dealCount > 0) {
    return NextResponse.json({ error: `Impossible de supprimer : ${dealCount} deal(s) associé(s)` }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
}
