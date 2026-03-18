import { prisma } from "@/lib/prisma";
import CreateUserForm from "./CreateUserForm";
import DeleteUserButton from "./DeleteUserButton";
import EditCommissionButton from "./EditCommissionButton";

export default async function UtilisateursPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  const closers = users.filter((u) => u.role === "CLOSER");
  const setters = users.filter((u) => u.role === "SETTER");
  const comptas = users.filter((u) => u.role === "COMPTA");

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des accès</h1>
        <p className="text-gray-500 text-sm mt-1">Créez et gérez les comptes closers et comptables</p>
      </div>

      {/* Créer un utilisateur */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Créer un accès</h2>
        <CreateUserForm />
      </div>

      {/* Closers */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Closers ({closers.length})</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {closers.map((user) => (
            <div key={user.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <EditCommissionButton userId={user.id} currentRate={user.commissionRate} />
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Closer</span>
                <DeleteUserButton userId={user.id} userName={user.name} />
              </div>
            </div>
          ))}
          {closers.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">Aucun closer.</p>
          )}
        </div>
      </div>

      {/* Setters */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Setters ({setters.length})</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {setters.map((user) => (
            <div key={user.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <EditCommissionButton userId={user.id} currentRate={user.commissionRate} />
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Setter</span>
                <DeleteUserButton userId={user.id} userName={user.name} />
              </div>
            </div>
          ))}
          {setters.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">Aucun setter.</p>
          )}
        </div>
      </div>

      {/* Comptables */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Comptables ({comptas.length})</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {comptas.map((user) => (
            <div key={user.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Compta</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
