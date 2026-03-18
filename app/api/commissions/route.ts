import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // format: "YYYY-MM"

  let year: number;
  let monthIndex: number;

  if (month) {
    const [y, m] = month.split("-").map(Number);
    year = y;
    monthIndex = m - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIndex = now.getMonth();
  }

  const startOfMonth = new Date(year, monthIndex, 1);
  const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  const userId = session.user.id;
  const role = session.user.role;

  const me = await prisma.user.findUnique({ where: { id: userId } });
  const commissionRate = me?.commissionRate ?? 0;

  let paidInstallments;

  if (role === "CLOSER") {
    paidInstallments = await prisma.installment.findMany({
      where: {
        deal: { closerId: userId },
        status: "PAID",
        paidAt: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { deal: { include: { setter: { select: { name: true } } } } },
      orderBy: { paidAt: "asc" },
    });
  } else if (role === "SETTER") {
    paidInstallments = await prisma.installment.findMany({
      where: {
        deal: { setterId: userId },
        status: "PAID",
        paidAt: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { deal: { include: { closer: { select: { name: true } } } } },
      orderBy: { paidAt: "asc" },
    });
  } else {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const totalCash = paidInstallments.reduce((s, i) => s + (i.paidAmount ?? 0), 0);
  const totalCommission = (totalCash * commissionRate) / 100;

  return NextResponse.json({
    month: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    commissionRate,
    totalCash,
    totalCommission,
    installments: paidInstallments.map((i) => ({
      id: i.id,
      paidAt: i.paidAt,
      paidAmount: i.paidAmount,
      commission: ((i.paidAmount ?? 0) * commissionRate) / 100,
      installmentNumber: i.installmentNumber,
      clientName: i.deal.clientName,
      dealId: i.dealId,
      counterpart: role === "CLOSER"
        ? (i.deal as { setter?: { name: string } | null }).setter?.name ?? null
        : (i.deal as { closer?: { name: string } }).closer?.name ?? null,
    })),
  });
}
