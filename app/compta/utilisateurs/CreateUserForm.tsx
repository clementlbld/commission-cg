"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateUserForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CLOSER");
  const [commissionRate, setCommissionRate] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, commissionRate: parseFloat(commissionRate) || 0 }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur lors de la création");
    } else {
      setSuccess(`Compte créé pour ${name} (${commissionRate}% commission)`);
      setName(""); setEmail(""); setPassword(""); setRole("CLOSER"); setCommissionRate("0");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Jean Dupont"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="jean@exemple.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="min. 6 caractères"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
          <select
            value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="CLOSER">Closer</option>
            <option value="SETTER">Setter</option>
            <option value="COMPTA">Comptable</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Commission (%)
            <span className="text-gray-400 font-normal ml-1 text-xs">— closers &amp; setters</span>
          </label>
          <input
            type="number" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)}
            min="0" max="100" step="0.1"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="10"
          />
        </div>
      </div>

      {role === "COMPTA" && (
        <p className="text-xs text-gray-400">Le taux de commission ne s&apos;applique pas aux comptables.</p>
      )}

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ {success}</p>}

      <button
        type="submit" disabled={loading}
        className="bg-purple-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Création..." : "Créer l'accès"}
      </button>
    </form>
  );
}
