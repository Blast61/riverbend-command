-- Add immutable submitted purchase snapshots; current request fields remain editable
-- only when returned. M1 has only version-1 submissions and no edit endpoint.
ALTER TABLE "ApprovalStage" ADD COLUMN "decision" TEXT;
CREATE TABLE "PurchaseRevision" (
  "requestId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "vendor" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL CHECK (typeof("amountCents") = 'integer' AND "amountCents" > 0 AND "amountCents" <= 2147483647),
  "reason" TEXT NOT NULL,
  "submittedAt" DATETIME NOT NULL,
  PRIMARY KEY ("requestId", "version"),
  CONSTRAINT "PurchaseRevision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "PurchaseRevision" ("requestId", "version", "vendor", "amountCents", "reason", "submittedAt")
SELECT "id", "version", "vendor", "amountCents", "reason", "submittedAt"
FROM "PurchaseRequest" WHERE "version" > 0;
