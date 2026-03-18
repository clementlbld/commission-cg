import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEur, formatDate, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";

export default async function SetterDealsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const me = await prisma.user.findUnique({ where: { id: userId } });
  const commissionRate = me?.commissionRate ?? 0;

  const deals = await prisma.deal.findMany({
    where: { setterId: userId },
    include: { installments: { orderBy: { installmentNumber: "asc" } }, closer: true },
    orderBy: { closedAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mes deals ({deals.length})</h1>

      {deals.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">Aucun deal associé pour le moment.</p>
        </div>
      )}

      <div className="space-y-4">
        {deals.map((deal) => {
          const totalPaid = deal.installments.filter((i) => i.status === "PAID").reduce((s, i) => s + (i.paidAmount ?? 0), 0);
          const myCommission = (totalPaid * commissionRate) / 100;

          return (
            <div key={deal.id} className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-900">{deal.clientName}</h2>
                  <p className="text-xs text-gray-400">Closé par {deal.closer.name} le {formatDate(deal.closedAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatEur(deal.totalAmount)}</p>
                  <p className="text-xs text-emerald-600 font-semibold">{formatEur(myCommission)} ma commission ({commissionRate}%)</p>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {deal.installments.map((inst) => (
                  <div key={inst.id} className="px-5 py-2.5 flex items-center gap-4">
                    <span className="text-xs text-gray-400 w-8">#{inst.installmentNumber}</span>
                    <span className="text-sm text-gray-600 w-24">{formatDate(inst.dueDate)}</span>
                    <span className="text-sm font-medium text-gray-900 w-20">{formatEur(inst.expectedAmount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inst.status]}`}>
                      {STATUS_LABELS[inst.status]}
                    </span>
                    {inst.status === "PAID" && (
                      <span className="ml-auto text-xs font-semibold text-emerald-600">
                        +{formatEur(((inst.paidAmount ?? 0) * commissionRate) / 100)}
                      </span>
                    )}
                    {inst.comment && (
                      <span className="text-xs text-gray-400 italic">💬 {inst.comment}</span>
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
