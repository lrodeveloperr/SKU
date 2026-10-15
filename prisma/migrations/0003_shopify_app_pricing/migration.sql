ALTER TABLE "Shop"
  ADD COLUMN "shopifyShopId" TEXT,
  ADD COLUMN "billingStatus" TEXT NOT NULL DEFAULT 'UNSELECTED',
  ADD COLUMN "billingVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "billingPeriodEnd" TIMESTAMP(3),
  ADD COLUMN "billingCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "billingPendingPlan" TEXT,
  ADD COLUMN "billingPrice" TEXT,
  ADD COLUMN "billingCurrency" TEXT,
  ADD COLUMN "billingError" TEXT;
UPDATE "Shop" SET "plan" = 'large-catalog' WHERE "plan" = 'large';
