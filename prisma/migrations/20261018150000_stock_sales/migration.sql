ALTER TABLE "stock_items"
ADD COLUMN "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "stock_items"
SET "salePrice" = "unitCost";

CREATE TABLE "stock_sales" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "branchId" TEXT NOT NULL,
    "soldById" TEXT NOT NULL,
    "customerName" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_sales_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_sales_total_check" CHECK ("total" >= 0)
);

CREATE INDEX "stock_sales_branchId_createdAt_idx"
ON "stock_sales"("branchId", "createdAt");

ALTER TABLE "stock_sales"
ADD CONSTRAINT "stock_sales_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_sales"
ADD CONSTRAINT "stock_sales_soldById_fkey"
FOREIGN KEY ("soldById") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "stock_sale_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "saleId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "stock_sale_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_sale_items_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "stock_sale_items_price_check"
        CHECK ("unitPrice" >= 0 AND "totalPrice" >= 0)
);

CREATE INDEX "stock_sale_items_saleId_idx" ON "stock_sale_items"("saleId");
CREATE INDEX "stock_sale_items_stockItemId_idx"
ON "stock_sale_items"("stockItemId");

ALTER TABLE "stock_sale_items"
ADD CONSTRAINT "stock_sale_items_saleId_fkey"
FOREIGN KEY ("saleId") REFERENCES "stock_sales"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_sale_items"
ADD CONSTRAINT "stock_sale_items_stockItemId_fkey"
FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" (
    "id", "name", "description", "slug", "isSystem", "createdAt", "updatedAt"
)
VALUES (
    gen_random_uuid(),
    'Vender artigos do stock',
    'Registar vendas e baixar artigos do stock.',
    'stock.sell',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "updatedAt" = CURRENT_TIMESTAMP,
    "deletedAt" = NULL;

INSERT INTO "role_permissions" (
    "id", "roleId", "permissionId", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(),
    roles."id",
    permissions."id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "roles" roles
JOIN "permissions" permissions ON permissions."slug" = 'stock.sell'
WHERE roles."slug" IN ('admin', 'secretary')
ON CONFLICT ("roleId", "permissionId") DO UPDATE
SET "deletedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP;
