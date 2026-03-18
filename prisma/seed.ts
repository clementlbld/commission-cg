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

  // Deal 1: Alex — 5000€ en 4 fois avec acompte
  const deal1 = await prisma.deal.create({
    data: {
      clientName: "Jean-Pierre Moreau",
      totalAmount: 5000,
      notes: "Accompagnement business 6 mois, signé le 15/03",
      closerId: closer1.id,
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

  console.log("✅ Seed terminé !");
  console.log("");
  console.log("Comptes créés :");
  console.log("  Compta  : compta@app.fr   / compta123");
  console.log("  Closer 1: alex@app.fr     / closer123");
  console.log("  Closer 2: lea@app.fr      / closer123");
  console.log("");
  console.log(`Deals créés : ${deal1.id}, ${deal2.id}, ${deal3.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
