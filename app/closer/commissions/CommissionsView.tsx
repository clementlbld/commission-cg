"use client";

import { useEffect, useState, useCallback } from "react";

type Installment = {
  id: string;
  paidAt: string;
  paidAmount: number;
  commission: number;
  installmentNumber: number;
  clientName: string;
  dealId: string;
  counterpart: string | null;
};

type CommissionData = {
  month: string;
  commissionRate: number;
  totalCash: number;
  totalCommission: number;
  installments: Installment[];
};

function formatEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function defaultMonth() {
  const now = new Date();
  // Before the 10th: show previous month (invoice not yet done)
  if (now.getDate() < 10) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function prevMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function CommissionsView({ accentColor = "indigo", counterpartLabel = "Setter" }: {
  accentColor?: "indigo" | "emerald";
  counterpartLabel?: string;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);

  const accent = accentColor === "emerald" ? "text-emerald-600" : "text-indigo-600";
  const accentBg = accentColor === "emerald" ? "bg-emerald-50 border-emerald-200" : "bg-indigo-50 border-indigo-200";

  const load = useCallback(async (m: string) => {
    setLoading(true);
    const res = await fetch(`/api/commissions?month=${m}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  const isCurrentMonth = month === currentMonth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes commissions</h1>
        <p className="text-gray-500 text-sm mt-1">Factures émises le 10 du mois suivant</p>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMonth(prevMonth(month))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← Précédent
        </button>
        <span className="font-semibold text-gray-900 capitalize min-w-36 text-center">
          {monthLabel(month)}
        </span>
        <button
          onClick={() => setMonth(nextMonth(month))}
          disabled={isCurrentMonth}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Suivant →
        </button>
        {month !== defaultMonth() && (
          <button
            onClick={() => setMonth(defaultMonth())}
            className={`text-xs ${accent} hover:underline ml-2`}
          >
            Mois en cours
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">Chargement…</p>
        </div>
      ) : data && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-xl border p-5 ${accentBg}`}>
              <p className="text-sm text-gray-500">Commission {monthLabel(month)}</p>
              <p className={`text-3xl font-bold mt-1 ${accent}`}>{formatEur(data.totalCommission)}</p>
              <p className="text-xs text-gray-400 mt-1">{data.commissionRate}% · {formatEur(data.totalCash)} encaissé</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Paiements reçus</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data.installments.length}</p>
              <p className="text-xs text-gray-400 mt-1">mensualité{data.installments.length > 1 ? "s" : ""} validée{data.installments.length > 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Detail */}
          {data.installments.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Détail des paiements</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {data.installments.map((inst) => (
                  <div key={inst.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{inst.clientName}</p>
                      <p className="text-xs text-gray-400">
                        Mensualité n°{inst.installmentNumber} · {formatDate(inst.paidAt)}
                        {inst.counterpart && ` · ${counterpartLabel} : ${inst.counterpart}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{formatEur(inst.paidAmount)}</p>
                      <p className={`font-bold text-sm ${accent}`}>+{formatEur(inst.commission)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-xl">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <div className="text-right">
                  <span className="text-sm text-gray-600">{formatEur(data.totalCash)}</span>
                  <span className={`font-bold text-sm ml-4 ${accent}`}>+{formatEur(data.totalCommission)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <p className="text-gray-400 text-sm">Aucun paiement validé en {monthLabel(month)}.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
