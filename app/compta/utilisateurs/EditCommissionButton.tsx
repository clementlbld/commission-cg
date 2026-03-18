"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditCommissionButton({
  userId,
  currentRate,
}: {
  userId: string;
  currentRate: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentRate));
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionRate: parseFloat(value) || 0 }),
    });
    setLoading(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min="0"
          max="100"
          step="0.1"
          className="w-16 border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          autoFocus
        />
        <span className="text-xs text-gray-500">%</span>
        <button
          onClick={handleSave}
          disabled={loading}
          className="text-xs text-purple-600 font-medium hover:underline disabled:opacity-50"
        >
          OK
        </button>
        <button
          onClick={() => { setEditing(false); setValue(String(currentRate)); }}
          className="text-xs text-gray-400 hover:underline"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-xs text-gray-500 hover:text-purple-600 transition-colors"
      title="Modifier le taux"
    >
      {`${currentRate}%`} <span className="opacity-50">✎</span>
    </button>
  );
}
