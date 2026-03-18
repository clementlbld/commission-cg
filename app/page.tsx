import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "COMPTA") redirect("/compta/dashboard");
  redirect("/closer/dashboard");
}
