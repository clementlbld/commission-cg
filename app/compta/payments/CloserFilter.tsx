"use client";

import { useRouter } from "next/navigation";

interface Props {
  closers: { id: string; name: string }[];
  currentCloserId?: string;
  currentStatus?: string;
}

export default function CloserFilter({ closers, currentCloserId, currentStatus }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const url = `/compta/payments${currentStatus ? `?status=${currentStatus}` : ""}${val ? `${currentStatus ? "&" : "?"}closerId=${val}` : ""}`;
    router.push(url);
  }

  return (
    <select
      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 ml-auto focus:outline-none focus:ring-2 focus:ring-purple-500"
      defaultValue={currentCloserId || ""}
      onChange={handleChange}
    >
      <option value="">Tous les closers</option>
      {closers.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
