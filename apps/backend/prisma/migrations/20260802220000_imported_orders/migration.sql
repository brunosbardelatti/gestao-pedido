-- CreateEnum
CREATE TYPE "ImportedOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "imported_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "idempotency_key" VARCHAR(120) NOT NULL,
    "nfe_access_key" VARCHAR(44),
    "supplier_name" VARCHAR(255),
    "status" "ImportedOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "raw_xml" TEXT NOT NULL,
    "parsed_data" JSONB NOT NULL,
    "order_id" UUID,
    "rejection_reason" VARCHAR(500),
    "imported_by_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "imported_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "imported_order_id" UUID NOT NULL,
    "product_code" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "imported_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "imported_orders_idempotency_key_key" ON "imported_orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "imported_orders_status_idx" ON "imported_orders"("status");

-- AddForeignKey
ALTER TABLE "imported_orders" ADD CONSTRAINT "imported_orders_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_orders" ADD CONSTRAINT "imported_orders_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_orders" ADD CONSTRAINT "imported_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_order_items" ADD CONSTRAINT "imported_order_items_imported_order_id_fkey" FOREIGN KEY ("imported_order_id") REFERENCES "imported_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
