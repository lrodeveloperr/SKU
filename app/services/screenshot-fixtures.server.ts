import type { IdentifierHealth } from "./health.server";
import type { RecoveryAnalytics } from "./analytics.server";
import type { Diagnostic } from "./diagnostic.server";

export const screenshotShop = {
  id: "screenshot-shop",
  domain: "exact-search-guard-test.myshopify.com",
  locale: "en",
  mode: "TEST" as const,
  enabled: true,
  embedActive: true,
  syncState: "READY" as const,
  syncError: null,
};

export const screenshotHealth: IdentifierHealth = {
  indexedVariants: 24618,
  indexedProducts: 7942,
  counts: {
    duplicates: 8,
    ambiguousAliases: 5,
    missingSku: 164,
    missingBarcode: 86,
  },
  duplicates: [
    {
      value: "BK-2049",
      types: ["SKU"],
      productIds: ["gid://shopify/Product/501", "gid://shopify/Product/502"],
      variantIds: ["gid://shopify/ProductVariant/1001", "gid://shopify/ProductVariant/1002"],
      variants: [
        {
          variantId: "gid://shopify/ProductVariant/1001",
          productId: "gid://shopify/Product/501",
          handle: "brake-pad-kit",
          title: "Brake Pad Kit",
          variantTitle: "Front",
        },
        {
          variantId: "gid://shopify/ProductVariant/1002",
          productId: "gid://shopify/Product/502",
          handle: "brake-pad-kit-pro",
          title: "Brake Pad Kit Pro",
          variantTitle: "Front",
        },
      ],
    },
    {
      value: "880145332901",
      types: ["BARCODE"],
      productIds: ["gid://shopify/Product/503", "gid://shopify/Product/504"],
      variantIds: ["gid://shopify/ProductVariant/1003", "gid://shopify/ProductVariant/1004"],
      variants: [
        {
          variantId: "gid://shopify/ProductVariant/1003",
          productId: "gid://shopify/Product/503",
          handle: "water-filter-core",
          title: "Water Filter Core",
          variantTitle: "Standard",
        },
        {
          variantId: "gid://shopify/ProductVariant/1004",
          productId: "gid://shopify/Product/504",
          handle: "water-filter-plus",
          title: "Water Filter Plus",
          variantTitle: "Standard",
        },
      ],
    },
  ],
  ambiguousAliases: [
    {
      compact: "abc123",
      values: ["ABC-123", "ABC 123"],
      variantIds: ["gid://shopify/ProductVariant/1005", "gid://shopify/ProductVariant/1006"],
    },
  ],
  missingSku: [
    {
      variantId: "gid://shopify/ProductVariant/1007",
      productId: "gid://shopify/Product/505",
      handle: "replacement-hose",
      title: "Replacement Hose",
      variantTitle: "2m",
    },
    {
      variantId: "gid://shopify/ProductVariant/1008",
      productId: "gid://shopify/Product/506",
      handle: "mounting-bracket",
      title: "Mounting Bracket",
      variantTitle: "Black",
    },
  ],
  missingBarcode: [
    {
      variantId: "gid://shopify/ProductVariant/1009",
      productId: "gid://shopify/Product/507",
      handle: "service-valve",
      title: "Service Valve",
      variantTitle: "3/4 inch",
    },
  ],
};

export function screenshotAnalytics(days: number): RecoveryAnalytics {
  return {
    days,
    recovered: 4286,
    matches: 3874,
    multiples: 412,
    fallbacks: 9814,
    timeouts: 12,
    errors: 7,
    unresolved: 738,
    topRecoveredProducts: [
      { handle: "brake-pad-kit", count: 42 },
      { handle: "water-filter-core", count: 31 },
      { handle: "service-valve", count: 26 },
      { handle: "mounting-bracket", count: 19 },
    ],
    topUnresolvedQueries: [
      { query: "BK204", count: 11 },
      { query: "FILTER 44", count: 8 },
      { query: "VALVE-9", count: 6 },
    ],
  };
}

export function screenshotDiagnostic(query: string): Diagnostic {
  return {
    query,
    eligible: true,
    normalized: {
      original: query,
      folded: query.toLowerCase(),
      spaced: query.toLowerCase(),
      compact: query.toLowerCase().replace(/[^a-z0-9]/g, ""),
    },
    stage: "compact",
    response: {
      v: 1,
      status: "match",
      matches: [
        {
          title: "Brake Pad Kit",
          variantTitle: "Front",
          url: "/products/brake-pad-kit?variant=1001",
          identifierTypes: ["SKU"],
          inStock: true,
        },
      ],
    },
    experience: "test",
  };
}
