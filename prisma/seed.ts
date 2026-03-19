import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log("🌱 Seeding...");

  // Nettoyage pour éviter les doublons si seed relancé plusieurs fois
  await prisma.installment.deleteMany();
  await prisma.deal.deleteMany();

  // Users
  const compta = await prisma.user.upsert({
    where: { email: "compta@app.fr" },
    update: {},
    create: {
      name: "Sophie Compta",
      email: "compta@app.fr",
      passwordHash: await bcrypt.hash("compta123", 10),
      role: "COMPTA",
    },
  });

  const closer1 = await prisma.user.upsert({
    where: { email: "alex@app.fr" },
    update: {},
    create: {
      name: "Alex Martin",
      email: "alex@app.fr",
      passwordHash: await bcrypt.hash("closer123", 10),
      role: "CLOSER",
    },
  });

  const closer2 = await prisma.user.upsert({
    where: { email: "lea@app.fr" },
    update: {},
    create: {
      name: "Léa Dubois",
      email: "lea@app.fr",
      passwordHash: await bcrypt.hash("closer123", 10),
      role: "CLOSER",
    },
  });

  const setter1 = await prisma.user.upsert({
    where: { email: "hugo@app.fr" },
    update: {},
    create: {
      name: "Hugo Setter",
      email: "hugo@app.fr",
      passwordHash: await bcrypt.hash("setter123", 10),
      role: "SETTER",
      commissionRate: 10,
    },
  });

  // Deal 1: Alex — 5000€ en 4 fois avec acompte
  const deal1 = await prisma.deal.create({
    data: {
      clientName: "Jean-Pierre Moreau",
      totalAmount: 5000,
      notes: "Accompagnement business 6 mois, signé le 15/03",
      closerId: closer1.id,
      setterId: setter1.id,
      closedAt: new Date("2026-03-15"),
      installments: {
        create: [
          {
            installmentNumber: 1,
            dueDate: new Date("2026-03-15"),
            expectedAmount: 500,
            paidAmount: 500,
            status: "PAID",
            paidAt: new Date("2026-03-16"),
            validatedById: compta.id,
          },
          {
            installmentNumber: 2,
            dueDate: new Date("2026-04-15"),
            expectedAmount: 1500,
            status: "PENDING",
          },
          {
            installmentNumber: 3,
            dueDate: new Date("2026-05-15"),
            expectedAmount: 1500,
            status: "PENDING",
          },
          {
            installmentNumber: 4,
            dueDate: new Date("2026-06-15"),
            expectedAmount: 1500,
            status: "PENDING",
          },
        ],
      },
    },
  });

  // Deal 2: Alex — 3000€ en 2 fois, mensualité en retard
  const deal2 = await prisma.deal.create({
    data: {
      clientName: "Marie Fontaine",
      totalAmount: 3000,
      closerId: closer1.id,
      setterId: setter1.id,
      closedAt: new Date("2026-02-01"),
      installments: {
        create: [
          {
            installmentNumber: 1,
            dueDate: new Date("2026-02-01"),
            expectedAmount: 1500,
            paidAmount: 1500,
            status: "PAID",
            paidAt: new Date("2026-02-02"),
            validatedById: compta.id,
          },
          {
            installmentNumber: 2,
            dueDate: new Date("2026-03-01"),
            expectedAmount: 1500,
            status: "PENDING",
            comment: "Mensualité reportée — à relancer",
          },
        ],
      },
    },
  });

  // Deal 3: Léa — 8000€ en 3 fois, paiement partiel
  const deal3 = await prisma.deal.create({
    data: {
      clientName: "Thomas Bernard",
      totalAmount: 8000,
      notes: "Formation e-commerce premium",
      closerId: closer2.id,
      closedAt: new Date("2026-03-10"),
      installments: {
        create: [
          {
            installmentNumber: 1,
            dueDate: new Date("2026-03-10"),
            expectedAmount: 2000,
            paidAmount: 1800,
            status: "PARTIAL",
            paidAt: new Date("2026-03-11"),
            validatedById: compta.id,
            comment: "Paiement partiel, solde de 200€ à régler",
          },
          {
            installmentNumber: 2,
            dueDate: new Date("2026-04-10"),
            expectedAmount: 3000,
            status: "PENDING",
          },
          {
            installmentNumber: 3,
            dueDate: new Date("2026-05-10"),
            expectedAmount: 3000,
            status: "PENDING",
          },
        ],
      },
    },
  });

  // Deal 4: Hugo setter — Janvier 2026, tout payé
  const deal4 = await prisma.deal.create({
    data: {
      clientName: "Sophie Leclerc",
      totalAmount: 4000,
      notes: "Mentorat 3 mois — apporté par Hugo",
      closerId: closer1.id,
      setterId: setter1.id,
      closedAt: new Date("2026-01-05"),
      installments: {
        create: [
          {
            installmentNumber: 1,
            dueDate: new Date("2026-01-05"),
            expectedAmount: 2000,
            paidAmount: 2000,
            status: "PAID",
            paidAt: new Date("2026-01-06"),
            validatedById: compta.id,
          },
          {
            installmentNumber: 2,
            dueDate: new Date("2026-02-05"),
            expectedAmount: 2000,
            paidAmount: 2000,
            status: "PAID",
            paidAt: new Date("2026-02-06"),
            validatedById: compta.id,
          },
        ],
      },
    },
  });

  // Deal 5: Hugo setter — Février 2026, tout payé
  const deal5 = await prisma.deal.create({
    data: {
      clientName: "Nicolas Petit",
      totalAmount: 6000,
      notes: "Coaching business 12 semaines",
      closerId: closer2.id,
      setterId: setter1.id,
      closedAt: new Date("2026-02-10"),
      installments: {
        create: [
          {
            installmentNumber: 1,
            dueDate: new Date("2026-02-10"),
            expectedAmount: 2000,
            paidAmount: 2000,
            status: "PAID",
            paidAt: new Date("2026-02-11"),
            validatedById: compta.id,
          },
          {
            installmentNumber: 2,
            dueDate: new Date("2026-03-10"),
            expectedAmount: 2000,
            paidAmount: 2000,
            status: "PAID",
            paidAt: new Date("2026-03-10"),
            validatedById: compta.id,
          },
          {
            installmentNumber: 3,
            dueDate: new Date("2026-04-10"),
            expectedAmount: 2000,
            status: "PENDING",
          },
        ],
      },
    },
  });

  console.log("✅ Seed terminé !");
  console.log("");
  console.log("Comptes créés :");
  console.log("  Compta  : compta@app.fr   / compta123");
  console.log("  Closer 1: alex@app.fr     / closer123");
  console.log("  Closer 2: lea@app.fr      / closer123");
  console.log("  Setter 1: hugo@app.fr     / setter123  (10% commission)");
  console.log("");
  console.log(`Deals créés : ${deal1.id}, ${deal2.id}, ${deal3.id}, ${deal4.id}, ${deal5.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
