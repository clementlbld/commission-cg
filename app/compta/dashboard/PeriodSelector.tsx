"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type PeriodType = "week" | "month" | "quarter" | "year";

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=sun, 1=mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
}

export default function PeriodSelector({
  periodType,
  year,
  month,
  quarter,
  weekStart,
}: {
  periodType: PeriodType;
  year: number;
  month: number;
  quarter: number;
  weekStart: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [type, setType] = useState<PeriodType>(periodType);

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

  const months = [
    "Janvier","Février","Mars","Avril","Mai","Juin",
    "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
  ];

  function navigate(params: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("month");
    p.delete("quarter");
    p.delete("weekStart");
    for (const [k, v] of Object.entries(params)) p.set(k, v);
    router.push(`?${p.toString()}`);
  }

  function handleTypeChange(t: PeriodType) {
    setType(t);
    if (t === "week") {
      const monday = getMondayOf(now);
      const ws = monday.toISOString().split("T")[0];
      navigate({ type: "week", weekStart: ws });
    } else if (t === "month") {
      navigate({ type: "month", year: String(year), month: String(month) });
    } else if (t === "quarter") {
      navigate({ type: "quarter", year: String(year), quarter: String(quarter) });
    } else {
      navigate({ type: "year", year: String(year) });
    }
  }

  function shiftWeek(delta: number) {
    const current = new Date(weekStart + "T00:00:00");
    current.setDate(current.getDate() + delta * 7);
    navigate({ type: "week", weekStart: current.toISOString().split("T")[0] });
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    navigate({ type: "month", year: String(d.getFullYear()), month: String(d.getMonth() + 1) });
  }

  function shiftQuarter(delta: number) {
    let q = quarter + delta;
    let y = year;
    if (q > 4) { q -= 4; y++; }
    if (q < 1) { q += 4; y--; }
    navigate({ type: "quarter", year: String(y), quarter: String(q) });
  }

  function shiftYear(delta: number) {
    navigate({ type: "year", year: String(year + delta) });
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
      {/* Onglets */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white text-sm">
        {(["week", "month", "quarter", "year"] as PeriodType[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTypeChange(t)}
            className={`px-3 py-1.5 font-medium transition-colors ${
              type === t ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t === "week" ? "Semaine" : t === "month" ? "Mois" : t === "quarter" ? "Trimestre" : "Année"}
          </button>
        ))}
      </div>

      {/* Navigation semaine */}
      {type === "week" && (
        <div className="flex items-center gap-2">
          <button onClick={() => shiftWeek(-1)} className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 text-sm">←</button>
          <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">{formatWeekLabel(weekStart)}</span>
          <button onClick={() => shiftWeek(1)} className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 text-sm">→</button>
        </div>
      )}

      {/* Navigation mois */}
      {type === "month" && (
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 text-sm">←</button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center capitalize">
            {new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </span>
          <button onClick={() => shiftMonth(1)} className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 text-sm">→</button>
        </div>
      )}

      {/* Navigation trimestre */}
      {type === "quarter" && (
        <div className="flex items-center gap-2">
          <button onClick={() => shiftQuarter(-1)} className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 text-sm">←</button>
          <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
            {["T1 — Jan·Fév·Mar","T2 — Avr·Mai·Jun","T3 — Juil·Aoû·Sep","T4 — Oct·Nov·Déc"][quarter - 1]} {year}
          </span>
          <button onClick={() => shiftQuarter(1)} className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 text-sm">→</button>
        </div>
      )}

      {/* Navigation année */}
      {type === "year" && (
        <div className="flex items-center gap-2">
          <button onClick={() => shiftYear(-1)} className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 text-sm">←</button>
          <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">{year}</span>
          <button onClick={() => shiftYear(1)} className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 text-sm">→</button>
        </div>
      )}
    </div>
  );
}
