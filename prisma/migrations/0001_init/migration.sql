-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ShopMode" AS ENUM ('TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "OutOfStockMode" AS ENUM ('SHOW', 'WARN', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "SyncState" AS ENUM ('PENDING', 'IMPORTING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncJobType" AS ENUM ('INITIAL_IMPORT', 'WEBHOOK', 'RECONCILE');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('SKU', 'BARCODE', 'MODEL');

-- CreateEnum
CREATE TYPE "SearchOutcome" AS ENUM ('MATCH', 'MULTIPLE', 'FALLBACK', 'TIMEOUT', 'ERROR');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'development',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "mode" "ShopMode" NOT NULL DEFAULT 'TEST',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "outOfStockMode" "OutOfStockMode" NOT NULL DEFAULT 'SHOW',
    "modelMetafieldNamespace" TEXT,
    "modelMetafieldKey" TEXT,
    "embedActive" BOOLEAN NOT NULL DEFAULT false,
    "syncState" "SyncState" NOT NULL DEFAULT 'PENDING',
    "syncError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastReconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogVariant" (
    "shopId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "legacyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "variantTitle" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "published" BOOLEAN NOT NULL,
    "inStock" BOOLEAN NOT NULL,
    "productUpdatedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogVariant_pkey" PRIMARY KEY ("shopId","id")
);

-- CreateTable
CREATE TABLE "IdentifierEntry" (
    "shopId" TEXT NOT NULL,
    "type" "IdentifierType" NOT NULL,
    "variantId" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "folded" TEXT NOT NULL,
    "spaced" TEXT NOT NULL,
    "compact" TEXT NOT NULL,

    CONSTRAINT "IdentifierEntry_pkey" PRIMARY KEY ("shopId","type","variantId")
);

-- CreateTable
CREATE TABLE "SearchEvent" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "outcome" "SearchOutcome" NOT NULL,
    "identifierShaped" BOOLEAN NOT NULL,
    "query" TEXT,
    "stage" TEXT,
    "reason" TEXT,
    "productHandle" TEXT,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "SyncJobType" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'RUNNING',
    "idempotencyKey" TEXT,
    "bulkOperationId" TEXT,
    "topic" TEXT,
    "error" TEXT,
    "stats" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");

-- CreateIndex
CREATE INDEX "CatalogVariant_shopId_productId_idx" ON "CatalogVariant"("shopId", "productId");

-- CreateIndex
CREATE INDEX "CatalogVariant_shopId_syncedAt_idx" ON "CatalogVariant"("shopId", "syncedAt");

-- CreateIndex
CREATE INDEX "IdentifierEntry_shopId_original_idx" ON "IdentifierEntry"("shopId", "original");

-- CreateIndex
CREATE INDEX "IdentifierEntry_shopId_folded_idx" ON "IdentifierEntry"("shopId", "folded");

-- CreateIndex
CREATE INDEX "IdentifierEntry_shopId_spaced_idx" ON "IdentifierEntry"("shopId", "spaced");

-- CreateIndex
CREATE INDEX "IdentifierEntry_shopId_compact_idx" ON "IdentifierEntry"("shopId", "compact");

-- CreateIndex
CREATE INDEX "SearchEvent_shopId_createdAt_idx" ON "SearchEvent"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchEvent_shopId_outcome_createdAt_idx" ON "SearchEvent"("shopId", "outcome", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncJob_idempotencyKey_key" ON "SyncJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SyncJob_shopId_type_status_idx" ON "SyncJob"("shopId", "type", "status");

-- CreateIndex
CREATE INDEX "SyncJob_bulkOperationId_idx" ON "SyncJob"("bulkOperationId");

-- AddForeignKey
ALTER TABLE "CatalogVariant" ADD CONSTRAINT "CatalogVariant_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentifierEntry" ADD CONSTRAINT "IdentifierEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentifierEntry" ADD CONSTRAINT "IdentifierEntry_shopId_variantId_fkey" FOREIGN KEY ("shopId", "variantId") REFERENCES "CatalogVariant"("shopId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchEvent" ADD CONSTRAINT "SearchEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

