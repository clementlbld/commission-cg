import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEur, formatDate, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import { Suspense } from "react";
import PeriodSelector from "./PeriodSelector";

function getPeriodBounds(
  type: string,
  year: number,
  month: number,
  quarter: number
): { start: Date; end: Date; label: string } {
  if (type === "quarter") {
    const startMonth = (quarter - 1) * 3;
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
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const label = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { start, end, label };
}

export default async function SetterDashboard({
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

  const me = await prisma.user.findUnique({ where: { id: userId } });
  const commissionRate = me?.commissionRate ?? 0;

  const deals = await prisma.deal.findMany({
    where: { setterId: userId },
    include: { installments: { orderBy: { installmentNumber: "asc" } }, closer: true },
    orderBy: { closedAt: "desc" },
  });

  const paidInPeriod = deals.flatMap((d) =>
    d.installments
      .filter((i) => i.status === "PAID" && i.paidAt && i.paidAt >= start && i.paidAt <= end)
      .map((i) => ({ ...i, deal: d }))
  );

  const cashInPeriod = paidInPeriod.reduce((s, i) => s + (i.paidAmount ?? 0), 0);
  const commissionInPeriod = (cashInPeriod * commissionRate) / 100;

  const totalCash = deals
    .flatMap((d) => d.installments)
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + (i.paidAmount ?? 0), 0);
  const totalCommission = (totalCash * commissionRate) / 100;

  const overdue = deals.flatMap((d) =>
    d.installments
      .filter((i) => (i.status === "PENDING" || i.status === "PARTIAL") && i.dueDate < now)
      .map((i) => ({ ...i, deal: d }))
  );

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Commission sur la période</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{formatEur(commissionInPeriod)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatEur(cashInPeriod)} encaissé · {commissionRate}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total commissions (tous temps)</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{formatEur(totalCommission)}</p>
          <p className="text-xs text-gray-400 mt-1">
            sur {deals.length} deal{deals.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Mensualités en retard</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{overdue.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatEur(overdue.reduce((s, i) => s + i.expectedAmount, 0))} en attente
          </p>
        </div>
      </div>

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
                    Closer : {inst.deal.closer.name} · Échéance {formatDate(inst.dueDate)}
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
                  <p className="text-sm text-gray-600">{formatEur(inst.paidAmount ?? 0)} encaissé</p>
                  <p className="font-bold text-emerald-600">
                    {formatEur(((inst.paidAmount ?? 0) * commissionRate) / 100)} ma commission
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-gray-50 rounded-b-xl flex justify-between items-center border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Total {label}</span>
            <div className="text-right">
              <span className="font-bold text-emerald-600">{formatEur(commissionInPeriod)}</span>
              <p className="text-xs text-gray-400">sur {formatEur(cashInPeriod)} encaissé</p>
            </div>
          </div>
        </div>
      )}

      {deals.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">Aucun deal associé pour le moment.</p>
          <p className="text-gray-400 text-xs mt-1">
            Un closer doit vous associer lors de la création d&apos;un deal.
          </p>
        </div>
      )}
    </div>
  );
}
