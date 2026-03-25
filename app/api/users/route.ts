import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Requête non autorisée" }, { status: 403 });
  }

  const session = await auth();
  if (!session || session.user.role !== "COMPTA") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!rateLimit(`users:${session.user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const { name, email, password, role, commissionRate } = await req.json();

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  }

  if (typeof name !== "string" || name.length > 100) {
    return NextResponse.json({ error: "Nom invalide (max 100 caractères)" }, { status: 400 });
  }

  if (typeof email !== "string" || email.length > 200) {
    return NextResponse.json({ error: "Email invalide (max 200 caractères)" }, { status: 400 });
  }

  if (!["CLOSER", "SETTER", "COMPTA"].includes(role)) {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit faire au moins 8 caractères" }, { status: 400 });
  }

  const rate = parseFloat(commissionRate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    return NextResponse.json({ error: "Taux de commission invalide (0-100)" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, commissionRate: parseFloat(commissionRate) || 0 },
  });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 201 });
}
