"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Installment {
  dueDate: string;
  amount: string;
}

interface Setter {
  id: string;
  name: string;
  commissionRate: number;
}

export default function NewDealForm({ setters }: { setters: Setter[] }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [closedAt, setClosedAt] = useState(today);
  const [setterId, setSetterId] = useState("");
  const [installments, setInstallments] = useState<Installment[]>([{ dueDate: "", amount: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalAmount = installments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const selectedSetter = setters.find((s) => s.id === setterId);

  function addInstallment() {
    setInstallments([...installments, { dueDate: "", amount: "" }]);
  }

  function removeInstallment(idx: number) {
    if (installments.length === 1) return;
    setInstallments(installments.filter((_, i) => i !== idx));
  }

  function updateInstallment(idx: number, field: keyof Installment, value: string) {
    const updated = [...installments];
    updated[idx] = { ...updated[idx], [field]: value };
    setInstallments(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!clientName.trim()) return setError("Nom du client requis");
    if (installments.some((i) => !i.dueDate || !i.amount)) return setError("Veuillez remplir toutes les mensualités");

    setLoading(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          notes,
          closedAt,
          setterId: setterId || null,
          installments: installments.map((i) => ({ dueDate: i.dueDate, amount: parseFloat(i.amount) })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la création");
        setLoading(false);
        return;
      }

      router.push("/closer/deals");
      router.refresh();
    } catch {
      setError("Erreur réseau");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Infos client */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Informations client</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date de signature *</label>
          <input
            type="date" value={closedAt} onChange={(e) => setClosedAt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom du client *</label>
          <input
            type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Jean Dupont"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Ex: Accompagnement 6 mois, payable en 3 fois..."
          />
        </div>

        {/* Setter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Setter associé
            <span className="text-gray-400 font-normal ml-1 text-xs">(optionnel)</span>
          </label>
          {setters.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucun setter enregistré.</p>
          ) : (
            <select
              value={setterId}
              onChange={(e) => setSetterId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Aucun setter —</option>
              {setters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.commissionRate}% commission)
                </option>
              ))}
            </select>
          )}
          {selectedSetter && (
            <p className="text-xs text-emerald-600 mt-1">
              {selectedSetter.name} recevra {selectedSetter.commissionRate}% sur chaque paiement validé.
            </p>
          )}
        </div>
      </div>

      {/* Échéancier */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Échéancier de paiement</h2>
          <span className="text-sm font-semibold text-indigo-600">
            Total : {totalAmount > 0 ? `${totalAmount.toLocaleString("fr-FR")} €` : "—"}
          </span>
        </div>

        <div className="space-y-3">
          {installments.map((inst, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-6 text-right">{idx + 1}</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Date d&apos;échéance</label>
                <input
                  type="date" value={inst.dueDate} onChange={(e) => updateInstallment(idx, "dueDate", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Montant (€)</label>
                <input
                  type="number" value={inst.amount} onChange={(e) => updateInstallment(idx, "amount", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="500" min="0" step="0.01"
                />
              </div>
              <button
                type="button" onClick={() => removeInstallment(idx)} disabled={installments.length === 1}
                className="mt-5 text-gray-300 hover:text-red-400 disabled:opacity-20 text-lg"
              >✕</button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addInstallment} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          + Ajouter une mensualité
        </button>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit" disabled={loading}
          className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Enregistrement..." : "Créer le deal"}
        </button>
        <a href="/closer/deals" className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Annuler
        </a>
      </div>
    </form>
  );
}
