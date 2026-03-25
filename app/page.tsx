import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "COMPTA") redirect("/compta/dashboard");
  if (session.user.role === "SETTER") redirect("/setter/dashboard");
  redirect("/closer/dashboard");
}
