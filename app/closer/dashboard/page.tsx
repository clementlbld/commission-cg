import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEur, formatDate, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import PeriodSelector from "./PeriodSelector";

function getPeriodBounds(
  type: string,
  year: number,
  month: number,
  quarter: number
): { start: Date; end: Date; label: string } {
  if (type === "quarter") {
    const startMonth = (quarter - 1) * 3; // 0-indexed
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59);
    const qLabels = ["Jan · Fév · Mar", "Avr · Mai · Jun", "Juil · Aoû · Sep", "Oct · Nov · Déc"];
    return { start, end, label: `T${quarter} ${year} — ${qLabels[quarter - 1]}` };
  }
  if (type === "year") {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);
    return { start, end, label: `Année ${year}` };
  }
  // default: month
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const label = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { start, end, label };
}

export default async function CloserDashboard({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; quarter?: string; type?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const sp = await searchParams;

  const now = new Date();
  const type = sp.type ?? "month";
  const year = parseInt(sp.year ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth() + 1));
  const quarter = parseInt(sp.quarter ?? String(Math.ceil((now.getMonth() + 1) / 3)));

  const { start, end, label } = getPeriodBounds(type, year, month, quarter);

  const [me, paidInPeriod, overdue, upcoming] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { commissionRate: true } }),
    prisma.installment.findMany({
      where: { deal: { closerId: userId }, status: "PAID", paidAt: { gte: start, lte: end } },
      select: { id: true, paidAmount: true, paidAt: true, installmentNumber: true, deal: { select: { clientName: true } } },
      orderBy: { paidAt: "desc" },
    }),
    prisma.installment.findMany({
      where: { deal: { closerId: userId }, status: { in: ["PENDING", "PARTIAL"] }, dueDate: { lt: now } },
      select: { id: true, expectedAmount: true, dueDate: true, installmentNumber: true, status: true, comment: true, deal: { select: { clientName: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.installment.findMany({
      where: { deal: { closerId: userId }, status: "PENDING", dueDate: { gte: now < start ? start : now, lte: end } },
      select: { id: true, expectedAmount: true, dueDate: true, installmentNumber: true, deal: { select: { clientName: true } } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const commissionRate = me?.commissionRate ?? 0;
  const cashInPeriod = paidInPeriod.reduce((sum, i) => sum + (i.paidAmount ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1">
            Taux commission : <strong>{commissionRate}%</strong>
          </p>
        </div>
        <Suspense>
          <PeriodSelector year={year} month={month} quarter={quarter} periodType={type as "month" | "quarter" | "year"} />
        </Suspense>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Cash collecté</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{formatEur(cashInPeriod)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {paidInPeriod.length} paiement{paidInPeriod.length > 1 ? "s" : ""} · commission :{" "}
            {formatEur((cashInPeriod * commissionRate) / 100)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Mensualités en retard</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{overdue.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatEur(overdue.reduce((s, i) => s + i.expectedAmount, 0))} en attente
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">À venir sur la période</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{upcoming.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatEur(upcoming.reduce((s, i) => s + i.expectedAmount, 0))} attendu
          </p>
        </div>
      </div>

      {/* Mensualités en retard */}
      {overdue.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200">
          <div className="px-5 py-4 border-b border-red-100">
            <h2 className="font-semibold text-red-700">Mensualités en retard ({overdue.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {overdue.map((inst) => (
              <div key={inst.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{inst.deal.clientName}</p>
                  <p className="text-xs text-gray-500">
                    Échéance {formatDate(inst.dueDate)} · Mensualité n°{inst.installmentNumber}
                  </p>
                  {inst.comment && (
                    <p className="text-xs text-gray-400 italic mt-0.5">💬 {inst.comment}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inst.status]}`}
                  >
                    {STATUS_LABELS[inst.status]}
                  </span>
                  <span className="font-semibold text-gray-900">{formatEur(inst.expectedAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paiements de la période */}
      {paidInPeriod.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 capitalize">
              Paiements reçus — {label}
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {paidInPeriod.map((inst) => (
              <div key={inst.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{inst.deal.clientName}</p>
                  <p className="text-xs text-gray-500">
                    Mensualité n°{inst.installmentNumber} · validé le {formatDate(inst.paidAt!)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-green-600">{formatEur(inst.paidAmount ?? 0)}</span>
                  <p className="text-xs text-gray-400">
                    commission : {formatEur(((inst.paidAmount ?? 0) * commissionRate) / 100)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* Total */}
          <div className="px-5 py-3 bg-gray-50 rounded-b-xl flex justify-between items-center border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Total {label}</span>
            <div className="text-right">
              <span className="font-bold text-green-600">{formatEur(cashInPeriod)}</span>
              <p className="text-xs text-gray-400">
                commission : {formatEur((cashInPeriod * commissionRate) / 100)}
              </p>
            </div>
          </div>
        </div>
      )}

      {paidInPeriod.length === 0 && overdue.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm capitalize">Aucune activité — {label}.</p>
          <Link
            href="/closer/deals/new"
            className="mt-3 inline-block text-indigo-600 text-sm font-medium hover:underline"
          >
            Créer un nouveau deal →
          </Link>
        </div>
      )}
    </div>
  );
}
