import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEur, formatDate, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import Link from "next/link";

export default async function CloserDealsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const deals = await prisma.deal.findMany({
    where: { closerId: userId },
    include: { installments: { orderBy: { installmentNumber: "asc" } } },
    orderBy: { closedAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mes deals ({deals.length})</h1>
        <Link
          href="/closer/deals/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Nouveau deal
        </Link>
      </div>

      {deals.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">Aucun deal pour le moment.</p>
        </div>
      )}

      <div className="space-y-4">
        {deals.map((deal) => {
          const paidTotal = deal.installments.reduce((s, i) => s + (i.paidAmount ?? 0), 0);
          const pending = deal.installments.filter((i) => i.status === "PENDING" || i.status === "PARTIAL").length;

          return (
            <div key={deal.id} className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-900">{deal.clientName}</h2>
                  <p className="text-xs text-gray-400">Closé le {formatDate(deal.closedAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatEur(deal.totalAmount)}</p>
                  <p className="text-xs text-green-600">{formatEur(paidTotal)} reçu</p>
                  {pending > 0 && <p className="text-xs text-gray-400">{pending} en attente</p>}
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {deal.installments.map((inst) => (
                  <div key={inst.id} className="px-5 py-2.5 flex items-center gap-4">
                    <span className="text-xs text-gray-400 w-8">#{inst.installmentNumber}</span>
                    <span className="text-sm text-gray-600 w-24">{formatDate(inst.dueDate)}</span>
                    <span className="text-sm text-gray-900 font-medium w-20">{formatEur(inst.expectedAmount)}</span>
                    {inst.paidAmount != null && inst.status !== "PENDING" && inst.paidAmount !== inst.expectedAmount && (
                      <span className="text-xs text-blue-600">(reçu: {formatEur(inst.paidAmount)})</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inst.status]}`}>
                      {STATUS_LABELS[inst.status]}
                    </span>
                    {inst.comment && (
                      <span className="text-xs text-gray-400 italic truncate max-w-xs">💬 {inst.comment}</span>
                    )}
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
