import { auth } from "@/lib/auth";
import { signOut } from "@/lib/auth";
import Link from "next/link";

export default async function CloserLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-indigo-600 text-lg">💼 Commissions</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/closer/dashboard" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              Tableau de bord
            </Link>
            <Link href="/closer/deals" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              Mes deals
            </Link>
            <Link href="/closer/commissions" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              Commissions
            </Link>
            <Link href="/closer/deals/new" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              + Nouveau deal
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{session?.user?.name}</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Closer</span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600">
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
