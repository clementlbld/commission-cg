import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEur } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import PeriodSelector from "./PeriodSelector";

type PeriodType = "week" | "month" | "quarter" | "year";

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getPeriodBounds(
  type: PeriodType,
  year: number,
  month: number,
  quarter: number,
  weekStart: string
): { start: Date; end: Date; label: string } {
  if (type === "week") {
    const start = new Date(weekStart + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59);
    const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    return { start, end, label: `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}` };
  }
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

export default async function ComptaDashboard({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; year?: string; month?: string; quarter?: string; weekStart?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "COMPTA") redirect("/login");

  const sp = await searchParams;
  const now = new Date();

  const type = (sp.type ?? "month") as PeriodType;
  const year = parseInt(sp.year ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth() + 1));
  const quarter = parseInt(sp.quarter ?? String(Math.ceil((now.getMonth() + 1) / 3)));
  const weekStart = sp.weekStart ?? getMondayOf(now).toISOString().split("T")[0];

  const { start, end, label } = getPeriodBounds(type, year, month, quarter, weekStart);

  // 3 requêtes en parallèle — seulement les champs nécessaires
  const [allPaidInPeriod, allOverdue, closers] = await Promise.all([
    prisma.installment.findMany({
      where: { status: "PAID", paidAt: { gte: start, lte: end } },
      select: { paidAmount: true, paidAt: true, deal: { select: { closerId: true } } },
    }),
    prisma.installment.findMany({
      where: { status: { in: ["PENDING", "PARTIAL"] }, dueDate: { lt: now } },
      select: { expectedAmount: true, deal: { select: { closerId: true } } },
    }),
    prisma.user.findMany({
      where: { role: "CLOSER" },
      select: {
        id: true,
        name: true,
        commissionRate: true,
        _count: { select: { deals: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalCashInPeriod = allPaidInPeriod.reduce((s, i) => s + (i.paidAmount ?? 0), 0);
  const totalOverdueAmount = allOverdue.reduce((s, i) => s + i.expectedAmount, 0);

  // Ventilation par sous-période (calcul JS sur données déjà filtrées)
  let breakdown: { label: string; cash: number }[] = [];
  if (type === "week") {
    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    breakdown = days.map((dayLabel, idx) => {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() + idx);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59);
      const cash = allPaidInPeriod
        .filter((i) => i.paidAt && i.paidAt >= dayStart && i.paidAt <= dayEnd)
        .reduce((s, i) => s + (i.paidAmount ?? 0), 0);
      return { label: dayLabel, cash };
    });
  } else if (type === "month") {
    const current = new Date(start);
    while (current <= end) {
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > end) weekEnd.setTime(end.getTime());
      const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      const cash = allPaidInPeriod
        .filter((i) => i.paidAt && i.paidAt >= current && i.paidAt <= weekEnd)
        .reduce((s, i) => s + (i.paidAmount ?? 0), 0);
      breakdown.push({ label: `${fmt(current)} – ${fmt(weekEnd)}`, cash });
      current.setDate(current.getDate() + 7);
    }
  } else if (type === "quarter") {
    for (let m = 0; m < 3; m++) {
      const mStart = new Date(year, (quarter - 1) * 3 + m, 1);
      const mEnd = new Date(year, (quarter - 1) * 3 + m + 1, 0, 23, 59, 59);
      const cash = allPaidInPeriod
        .filter((i) => i.paidAt && i.paidAt >= mStart && i.paidAt <= mEnd)
        .reduce((s, i) => s + (i.paidAmount ?? 0), 0);
      breakdown.push({ label: mStart.toLocaleDateString("fr-FR", { month: "long" }), cash });
    }
  } else {
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1);
      const mEnd = new Date(year, m + 1, 0, 23, 59, 59);
      const cash = allPaidInPeriod
        .filter((i) => i.paidAt && i.paidAt >= mStart && i.paidAt <= mEnd)
        .reduce((s, i) => s + (i.paidAmount ?? 0), 0);
      breakdown.push({ label: mStart.toLocaleDateString("fr-FR", { month: "short" }), cash });
    }
  }

  const maxCash = Math.max(...breakdown.map((b) => b.cash), 1);

  // Stats par closer groupées en JS (pas de requêtes supplémentaires)
  const cashByCloser = new Map<string, number>();
  for (const i of allPaidInPeriod) {
    const id = i.deal.closerId;
    cashByCloser.set(id, (cashByCloser.get(id) ?? 0) + (i.paidAmount ?? 0));
  }
  const overdueByCloser = new Map<string, number>();
  for (const i of allOverdue) {
    const id = i.deal.closerId;
    overdueByCloser.set(id, (overdueByCloser.get(id) ?? 0) + 1);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Compta</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{label}</p>
        </div>
        <Suspense>
          <PeriodSelector periodType={type} year={year} month={month} quarter={quarter} weekStart={weekStart} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Cash total collecté</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{formatEur(totalCashInPeriod)}</p>
          <p className="text-xs text-gray-400 mt-1 capitalize">{label} · {allPaidInPeriod.length} paiement{allPaidInPeriod.length > 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Mensualités en retard</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{allOverdue.length}</p>
          <p className="text-xs text-gray-400 mt-1">{formatEur(totalOverdueAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Closers actifs</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{closers.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4 capitalize">Répartition du cash — {label}</h2>
        <div className="flex items-end gap-2 h-32">
          {breakdown.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500 font-medium">
                {b.cash > 0 ? formatEur(b.cash).replace(",00", "") : ""}
              </span>
              <div
                className="w-full rounded-t-md bg-purple-500 transition-all duration-300"
                style={{ height: `${Math.max((b.cash / maxCash) * 96, b.cash > 0 ? 4 : 0)}px` }}
              />
              <span className="text-xs text-gray-400 text-center leading-tight">{b.label}</span>
            </div>
          ))}
        </div>
        {totalCashInPeriod === 0 && (
          <p className="text-center text-gray-400 text-sm mt-4">Aucun paiement validé sur cette période.</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Performance par closer — <span className="capitalize font-normal text-gray-500">{label}</span></h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-3 text-gray-500 font-medium">Closer</th>
              <th className="px-5 py-3 text-gray-500 font-medium">Deals</th>
              <th className="px-5 py-3 text-gray-500 font-medium">Cash période</th>
              <th className="px-5 py-3 text-gray-500 font-medium">Commission</th>
              <th className="px-5 py-3 text-gray-500 font-medium">Impayés</th>
              <th className="px-5 py-3 text-gray-500 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {closers.map((closer) => {
              const cash = cashByCloser.get(closer.id) ?? 0;
              const commission = (cash * (closer.commissionRate ?? 0)) / 100;
              const overdueCount = overdueByCloser.get(closer.id) ?? 0;
              return (
                <tr key={closer.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {closer.name}
                    {closer.commissionRate > 0 && (
                      <span className="ml-1.5 text-xs text-gray-400">{closer.commissionRate}%</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{closer._count.deals}</td>
                  <td className="px-5 py-3 font-semibold text-green-600">{formatEur(cash)}</td>
                  <td className="px-5 py-3 font-medium text-purple-600">{formatEur(commission)}</td>
                  <td className="px-5 py-3">
                    {overdueCount > 0 ? (
                      <span className="text-red-600 font-medium">{overdueCount}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/compta/closers/${closer.id}`} className="text-purple-600 hover:underline text-xs">
                      Voir →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {closers.length === 0 && (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">Aucun closer enregistré.</div>
        )}
      </div>

      <div className="flex justify-end">
        <Link href="/compta/payments" className="text-sm text-purple-600 hover:underline font-medium">
          Voir tous les paiements →
        </Link>
      </div>
    </div>
  );
}
