import { prisma } from "@/lib/prisma";
import NewDealForm from "./NewDealForm";

export default async function NewDealPage() {
  const setters = await prisma.user.findMany({
    where: { role: "SETTER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, commissionRate: true },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau deal</h1>
        <p className="text-gray-500 text-sm mt-1">Renseignez le client et l&apos;échéancier de paiement</p>
      </div>
      <NewDealForm setters={setters} />
    </div>
  );
}
