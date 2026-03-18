-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "notes" TEXT,
    "closedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closerId" TEXT NOT NULL,
    "setterId" TEXT,
    "setterCommissionRate" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Deal_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Deal_setterId_fkey" FOREIGN KEY ("setterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Deal" ("clientName", "closedAt", "closerId", "createdAt", "id", "notes", "totalAmount") SELECT "clientName", "closedAt", "closerId", "createdAt", "id", "notes", "totalAmount" FROM "Deal";
DROP TABLE "Deal";
ALTER TABLE "new_Deal" RENAME TO "Deal";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
