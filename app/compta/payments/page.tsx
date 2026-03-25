import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEur, formatDate, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import Link from "next/link";
import CloserFilter from "./CloserFilter";

export default async function ComptaPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; closerId?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "COMPTA") redirect("/login");

  const { status, closerId } = await searchParams;

  const installments = await prisma.installment.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(closerId ? { deal: { closerId } } : {}),
    },
    include: {
      deal: {
        include: { closer: { select: { id: true, name: true } } },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const closers = await prisma.user.findMany({
    where: { role: "CLOSER" },
    orderBy: { name: "asc" },
  });

  const statuses = ["PENDING", "PAID", "PARTIAL", "DEFERRED"];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tous les paiements ({installments.length})</h1>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <span className="text-sm text-gray-500 font-medium">Filtrer par :</span>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/compta/payments"
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${!status && !closerId ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 text-gray-600 hover:border-purple-400"}`}
          >
            Tous
          </Link>
          {statuses.map((s) => (
            <Link
              key={s}
              href={`/compta/payments?status=${s}${closerId ? `&closerId=${closerId}` : ""}`}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${status === s ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 text-gray-600 hover:border-purple-400"}`}
            >
              {STATUS_LABELS[s]}
            </Link>
          ))}
        </div>
        <CloserFilter closers={closers} currentCloserId={closerId} currentStatus={status} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left bg-gray-50">
              <th className="px-5 py-3 text-gray-500 font-medium">Client</th>
              <th className="px-5 py-3 text-gray-500 font-medium">Closer</th>
              <th className="px-5 py-3 text-gray-500 font-medium">Échéance</th>
              <th className="px-5 py-3 text-gray-500 font-medium">Montant prévu</th>
              <th className="px-5 py-3 text-gray-500 font-medium">Montant reçu</th>
              <th className="px-5 py-3 text-gray-500 font-medium">Statut</th>
              <th className="px-5 py-3 text-gray-500 font-medium">Commentaire</th>
              <th className="px-5 py-3 text-gray-500 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {installments.map((inst) => (
              <tr key={inst.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{inst.deal.clientName}</td>
                <td className="px-5 py-3 text-gray-600">{inst.deal.closer.name}</td>
                <td className="px-5 py-3 text-gray-600">{formatDate(inst.dueDate)}</td>
                <td className="px-5 py-3 text-gray-900">{formatEur(inst.expectedAmount)}</td>
                <td className="px-5 py-3">
                  {inst.paidAmount != null ? (
                    <span className={inst.paidAmount >= inst.expectedAmount ? "text-green-600 font-semibold" : "text-orange-500 font-semibold"}>
                      {formatEur(inst.paidAmount)}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inst.status]}`}>
                    {STATUS_LABELS[inst.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400 italic text-xs max-w-32 truncate">
                  {inst.comment || "—"}
                </td>
                <td className="px-5 py-3">
                  <Link href={`/compta/payments/${inst.id}`} className="text-purple-600 hover:underline text-xs font-medium">
                    Gérer
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {installments.length === 0 && (
          <div className="p-10 text-center text-gray-400 text-sm">Aucun paiement trouvé.</div>
        )}
      </div>
    </div>
  );
}
