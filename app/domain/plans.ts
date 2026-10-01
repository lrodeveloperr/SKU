export interface Plan {
  key: string;
  name: string;
  priceUsd: number;
  maxVariants: number;
}

// From the brief's pricing table. Billing is not wired yet; these drive usage display only.
export const PLANS: Plan[] = [
  { key: "development", name: "Development", priceUsd: 0, maxVariants: 100 },
  { key: "starter", name: "Starter", priceUsd: 9, maxVariants: 5_000 },
  { key: "growth", name: "Growth", priceUsd: 19, maxVariants: 50_000 },
  { key: "large", name: "Large Catalog", priceUsd: 39, maxVariants: 250_000 },
];

export function planFor(key: string): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0]!;
}
