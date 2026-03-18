import { prisma } from "@/lib/prisma";
import { formatEur } from "@/lib/utils";
import Link from "next/link";

export default async function ComptaClosersPage() {
  const closers = await prisma.user.findMany({
    where: { role: "CLOSER" },
    include: {
      deals: {
        include: { installments: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Closers ({closers.length})</h1>

      <div className="grid gap-4">
        {closers.map((closer) => {
          const allInstallments = closer.deals.flatMap((d) => d.installments);
          const totalContracted = closer.deals.reduce((s, d) => s + d.totalAmount, 0);
          const totalCollected = allInstallments.reduce((s, i) => s + (i.paidAmount ?? 0), 0);
          const now = new Date();
          const overdueCount = allInstallments.filter(
            (i) => (i.status === "PENDING" || i.status === "PARTIAL") && i.dueDate < now
          ).length;

          return (
            <div key={closer.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{closer.name}</h2>
                <p className="text-sm text-gray-500">{closer.email}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-gray-600">{closer.deals.length} deal{closer.deals.length > 1 ? "s" : ""}</span>
                  <span className="text-green-600 font-medium">{formatEur(totalCollected)} collecté</span>
                  <span className="text-gray-400">sur {formatEur(totalContracted)}</span>
                  {overdueCount > 0 && (
                    <span className="text-red-500 font-medium">{overdueCount} impayé{overdueCount > 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
              <Link
                href={`/compta/closers/${closer.id}`}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Voir les deals →
              </Link>
            </div>
          );
        })}
        {closers.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            Aucun closer enregistré.
          </div>
        )}
      </div>
    </div>
  );
}
