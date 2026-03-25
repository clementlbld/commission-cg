import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEur, formatDate, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import { notFound } from "next/navigation";
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

export default async function CloserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; month?: string; quarter?: string; type?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "COMPTA") redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const now = new Date();
  const type = sp.type ?? "month";
  const year = parseInt(sp.year ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth() + 1));
  const quarter = parseInt(sp.quarter ?? String(Math.ceil((now.getMonth() + 1) / 3)));

  const { start, end, label } = getPeriodBounds(type, year, month, quarter);

  const closer = await prisma.user.findUnique({
    where: { id },
    include: {
      deals: {
        include: { installments: { orderBy: { installmentNumber: "asc" } } },
        orderBy: { closedAt: "desc" },
      },
    },
  });

  if (!closer || closer.role !== "CLOSER") notFound();

  const commissionRate = closer.commissionRate ?? 0;
  const allInstallments = closer.deals.flatMap((d) => d.installments);

  const paidInPeriod = allInstallments.filter(
    (i) => i.status === "PAID" && i.paidAt && i.paidAt >= start && i.paidAt <= end
  );
  const cashInPeriod = paidInPeriod.reduce((s, i) => s + (i.paidAmount ?? 0), 0);
  const commissionInPeriod = (cashInPeriod * commissionRate) / 100;

  const totalCollected = allInstallments
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + (i.paidAmount ?? 0), 0);
  const totalCommission = (totalCollected * commissionRate) / 100;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/compta/closers" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Closers
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{closer.name}</h1>
            <p className="text-sm text-gray-400">
              {closer.email} · Taux commission :{" "}
              <strong className="text-gray-600">{commissionRate}%</strong>
            </p>
          </div>
        </div>
        <Suspense>
          <PeriodSelector
            year={year}
            month={month}
            quarter={quarter}
            periodType={type as "month" | "quarter" | "year"}
          />
        </Suspense>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Cash collecté</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatEur(cashInPeriod)}</p>
          <p className="text-xs text-gray-400 mt-1 capitalize">{label}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Commission closer</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{formatEur(commissionInPeriod)}</p>
          <p className="text-xs text-gray-400 mt-1">{commissionRate}% · {label}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total collecté</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatEur(totalCollected)}</p>
          <p className="text-xs text-gray-400 mt-1">Tous temps</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total commission</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{formatEur(totalCommission)}</p>
          <p className="text-xs text-gray-400 mt-1">Tous temps · {commissionRate}%</p>
        </div>
      </div>

      {/* Résumé période */}
      {paidInPeriod.length > 0 && (
        <div className="bg-purple-50 rounded-xl border border-purple-100 px-5 py-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-purple-800 capitalize">{label}</p>
            <p className="text-xs text-purple-600 mt-0.5">
              {paidInPeriod.length} paiement{paidInPeriod.length > 1 ? "s" : ""} validé{paidInPeriod.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-green-700">{formatEur(cashInPeriod)} encaissé</p>
            <p className="text-sm text-purple-700 font-semibold">
              → {formatEur(commissionInPeriod)} de commission
            </p>
          </div>
        </div>
      )}

      {/* Deals */}
      <div className="space-y-4">
        {closer.deals.map((deal) => {
          const paid = deal.installments
            .filter((i) => i.status === "PAID")
            .reduce((s, i) => s + (i.paidAmount ?? 0), 0);
          return (
            <div key={deal.id} className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-900">{deal.clientName}</h2>
                  <p className="text-xs text-gray-400">Closé le {formatDate(deal.closedAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatEur(deal.totalAmount)}</p>
                  <p className="text-xs text-green-600">{formatEur(paid)} reçu</p>
                  {commissionRate > 0 && (
                    <p className="text-xs text-purple-500">
                      commission : {formatEur((paid * commissionRate) / 100)}
                    </p>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {deal.installments.map((inst) => (
                  <div key={inst.id} className="px-5 py-2.5 flex items-center gap-4">
                    <span className="text-xs text-gray-400 w-8">#{inst.installmentNumber}</span>
                    <span className="text-sm text-gray-600 w-24">{formatDate(inst.dueDate)}</span>
                    <span className="text-sm font-medium text-gray-900 w-20">
                      {formatEur(inst.expectedAmount)}
                    </span>
                    {inst.paidAmount != null && (
                      <span className="text-xs text-blue-600">(reçu: {formatEur(inst.paidAmount)})</span>
                    )}
                    <span
                      className={"text-xs px-2 py-0.5 rounded-full font-medium " + STATUS_COLORS[inst.status]}
                    >
                      {STATUS_LABELS[inst.status]}
                    </span>
                    {inst.comment && (
                      <span className="text-xs text-gray-400 italic">💬 {inst.comment}</span>
                    )}
                    <Link
                      href={"/compta/payments/" + inst.id}
                      className="ml-auto text-xs text-purple-600 hover:underline"
                    >
                      Gérer
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
