"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatEur } from "@/lib/utils";

interface Installment {
  id: string;
  expectedAmount: number;
  paidAmount: number | null;
  status: string;
  comment: string | null;
}

export default function ValidateForm({ installment }: { installment: Installment }) {
  const router = useRouter();
  const [paidAmount, setPaidAmount] = useState(
    installment.paidAmount?.toString() ?? installment.expectedAmount.toString()
  );
  const [status, setStatus] = useState(installment.status);
  const [comment, setComment] = useState(installment.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch(`/api/installments/${installment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAmount: parseFloat(paidAmount), status, comment }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la sauvegarde");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Erreur réseau, veuillez réessayer");
    } finally {
      setLoading(false);
    }
  }

  const STATUSES = [
    { value: "PENDING", label: "En attente" },
    { value: "PAID", label: "Payé" },
    { value: "PARTIAL", label: "Partiel" },
    { value: "DEFERRED", label: "Reporté" },
  ];

  const QUICK_COMMENTS = [
    "Mensualité reportée",
    "Paiement en cours",
    "Litige en cours",
    "Remboursement partiel",
  ];

  return (
    <div className="bg-white rounded-xl border border-purple-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-900">Valider / modifier ce paiement</h2>
      <p className="text-sm text-gray-500">Montant prévu : <strong>{formatEur(installment.expectedAmount)}</strong></p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant reçu (€)</label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              step="0.01"
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            placeholder="Ex: Mensualité reportée au mois prochain..."
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_COMMENTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setComment(c)}
                className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-purple-100 hover:text-purple-700 rounded-full text-gray-600 transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Enregistrement..." : "Valider"}
          </button>
          {success && (
            <span className="text-green-600 text-sm font-medium">✓ Sauvegardé</span>
          )}
        </div>
      </form>
    </div>
  );
}
