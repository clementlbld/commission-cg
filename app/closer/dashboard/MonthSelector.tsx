"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function MonthSelector({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const [y, m] = e.target.value.split("-");
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", y);
    params.set("month", m);
    router.push(`?${params.toString()}`);
  }

  // 12 mois passés + mois courant + 2 mois futurs
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = -12; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      value: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    });
  }

  return (
    <select
      value={`${year}-${month}`}
      onChange={handleChange}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 capitalize"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="capitalize">
          {opt.label}
        </option>
      ))}
    </select>
  );
}
