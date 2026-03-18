import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

export default async function ComptaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-purple-600 text-lg">📊 Commissions</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/compta/dashboard" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">
              Tableau de bord
            </Link>
            <Link href="/compta/payments" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">
              Paiements
            </Link>
            <Link href="/compta/closers" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">
              Closers
            </Link>
            <Link href="/compta/utilisateurs" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">
              Accès
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{session?.user?.name}</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Compta</span>
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
