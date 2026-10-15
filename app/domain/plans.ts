export interface Plan {
  key: string;
  name: string;
  priceUsd: number;
  maxVariants: number;
}

// Handles match Shopify App Pricing. Keep the old `large` value readable during migration.
export const PLANS: Plan[] = [
  { key: "development", name: "Development", priceUsd: 0, maxVariants: 100 },
  { key: "starter", name: "Starter", priceUsd: 9, maxVariants: 5_000 },
  { key: "growth", name: "Growth", priceUsd: 19, maxVariants: 50_000 },
  { key: "large-catalog", name: "Large Catalog", priceUsd: 39, maxVariants: 250_000 },
];

export function findPlan(key: string | null | undefined): Plan | null {
  return PLANS.find((p) => p.key === (key === "large" ? "large-catalog" : key)) ?? null;
}

export function planFor(key: string): Plan {
  return findPlan(key) ?? PLANS[0]!;
}
