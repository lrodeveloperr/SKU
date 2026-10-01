import { en, type Messages } from "./en";
import { es } from "./es";

export type Locale = "en" | "es";

export const messages: Record<Locale, Messages> = { en, es };

export function toLocale(value: string | null | undefined): Locale {
  return value === "es" ? "es" : "en";
}

/** Replaces {name} placeholders. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
}
