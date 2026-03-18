"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type PeriodType = "month" | "quarter" | "year";

export default function PeriodSelector({
  year,
  month,
  quarter,
  periodType,
}: {
  year: number;
  month: number;
  quarter: number;
  periodType: PeriodType;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [type, setType] = useState<PeriodType>(periodType);

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  function navigate(params: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("month");
    p.delete("quarter");
    for (const [k, v] of Object.entries(params)) p.set(k, v);
    router.push(`?${p.toString()}`);
  }

  function handleTypeChange(t: PeriodType) {
    setType(t);
    if (t === "month") {
      navigate({ type: "month", year: String(year), month: String(month) });
    } else if (t === "quarter") {
      navigate({ type: "quarter", year: String(year), quarter: String(quarter) });
    } else {
      navigate({ type: "year", year: String(year) });
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white text-sm">
        {(["month", "quarter", "year"] as PeriodType[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTypeChange(t)}
            className={`px-3 py-1.5 font-medium transition-colors ${
              type === t
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t === "month" ? "Mois" : t === "quarter" ? "Trimestre" : "Année"}
          </button>
        ))}
      </div>

      <select
        value={year}
        onChange={(e) =>
          navigate({
            type,
            year: e.target.value,
            ...(type === "month" ? { month: String(month) } : type === "quarter" ? { quarter: String(quarter) } : {}),
          })
        }
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {type === "month" && (
        <select
          value={month}
          onChange={(e) => navigate({ type: "month", year: String(year), month: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {months.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>
      )}

      {type === "quarter" && (
        <select
          value={quarter}
          onChange={(e) => navigate({ type: "quarter", year: String(year), quarter: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value={1}>T1 — Jan · Fév · Mar</option>
          <option value={2}>T2 — Avr · Mai · Juin</option>
          <option value={3}>T3 — Juil · Aoû · Sep</option>
          <option value={4}>T4 — Oct · Nov · Déc</option>
        </select>
      )}
    </div>
  );
}
