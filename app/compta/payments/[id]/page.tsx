import { prisma } from "@/lib/prisma";
import { formatEur, formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import ValidateForm from "./ValidateForm";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const installment = await prisma.installment.findUnique({
    where: { id },
    include: {
      deal: {
        include: {
          closer: true,
          installments: { orderBy: { installmentNumber: "asc" } },
        },
      },
      validator: true,
    },
  });

  if (!installment) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a href="/compta/payments" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</a>
        <h1 className="text-xl font-bold text-gray-900">
          Mensualité #{installment.installmentNumber} — {installment.deal.clientName}
        </h1>
      </div>

      {/* Infos du deal */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm">Informations deal</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Client</p>
            <p className="font-medium">{installment.deal.clientName}</p>
          </div>
          <div>
            <p className="text-gray-500">Closer</p>
            <p className="font-medium">{installment.deal.closer.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Total contrat</p>
            <p className="font-medium">{formatEur(installment.deal.totalAmount)}</p>
          </div>
          <div>
            <p className="text-gray-500">Date d&apos;échéance</p>
            <p className="font-medium">{formatDate(installment.dueDate)}</p>
          </div>
        </div>

        {installment.deal.notes && (
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">{installment.deal.notes}</p>
        )}
      </div>

      {/* Formulaire validation */}
      <ValidateForm installment={installment} />

      {/* Historique des mensualités du deal */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Toutes les mensualités de ce deal</h2>
        <div className="space-y-2">
          {installment.deal.installments.map((inst) => (
            <div
              key={inst.id}
              className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${inst.id === id ? "bg-purple-50 border border-purple-200" : "bg-gray-50"}`}
            >
              <span className="text-gray-600">#{inst.installmentNumber} · {formatDate(inst.dueDate)}</span>
              <span className="font-medium">{formatEur(inst.expectedAmount)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                inst.status === "PAID" ? "bg-green-100 text-green-700" :
                inst.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                inst.status === "PARTIAL" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {inst.status === "PAID" ? "Payé" : inst.status === "PENDING" ? "En attente" : inst.status === "PARTIAL" ? "Partiel" : "Reporté"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
