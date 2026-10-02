-- Keep the direct SKU/barcode fallback lookup within the storefront timeout.
CREATE INDEX "CatalogVariant_shopId_sku_idx" ON "CatalogVariant"("shopId", "sku");
CREATE INDEX "CatalogVariant_shopId_barcode_idx" ON "CatalogVariant"("shopId", "barcode");
