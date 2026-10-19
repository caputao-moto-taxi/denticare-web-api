CREATE TABLE "stock_catalog_entries" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "branchId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_catalog_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_catalog_entries_kind_check" CHECK ("kind" IN ('category', 'supplier'))
);

CREATE UNIQUE INDEX "stock_catalog_entries_branchId_kind_name_key"
ON "stock_catalog_entries"("branchId", "kind", "name");

CREATE INDEX "stock_catalog_entries_branchId_kind_idx"
ON "stock_catalog_entries"("branchId", "kind");

ALTER TABLE "stock_catalog_entries"
ADD CONSTRAINT "stock_catalog_entries_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "stock_catalog_entries" ("branchId", "kind", "name")
SELECT DISTINCT "branchId", 'category', "category"
FROM "stock_items"
WHERE "deletedAt" IS NULL AND BTRIM("category") <> ''
ON CONFLICT ("branchId", "kind", "name") DO NOTHING;

INSERT INTO "stock_catalog_entries" ("branchId", "kind", "name")
SELECT DISTINCT "branchId", 'supplier', "supplier"
FROM "stock_items"
WHERE "deletedAt" IS NULL AND BTRIM("supplier") <> ''
ON CONFLICT ("branchId", "kind", "name") DO NOTHING;