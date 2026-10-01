import { describe, expect, it } from "vitest";
import { shopperExperience } from "../../app/services/diagnostic.server";
import { en } from "../../app/i18n/en";
import { es } from "../../app/i18n/es";
import { fmt } from "../../app/i18n";

describe("shopperExperience", () => {
  it("reports what shoppers get right now", () => {
    expect(shopperExperience({ enabled: false, mode: "LIVE", syncState: "READY" })).toBe("off");
    expect(shopperExperience({ enabled: true, mode: "LIVE", syncState: "IMPORTING" })).toBe("not_ready");
    expect(shopperExperience({ enabled: true, mode: "TEST", syncState: "READY" })).toBe("test");
    expect(shopperExperience({ enabled: true, mode: "LIVE", syncState: "READY" })).toBe("live");
  });
});

describe("i18n", () => {
  const keys = (o: object, p = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

  it("Spanish has every English key and the same placeholders", () => {
    expect(keys(es)).toEqual(keys(en));
    const flat = (o: any): Record<string, string> => Object.fromEntries(keys(o).map((k) => [k, k.split(".").reduce((x, p) => x[p], o)]));
    const e = flat(en), s = flat(es);
    for (const k of Object.keys(e)) expect(placeholders(s[k]!), k).toBe(placeholders(e[k]!));
  });

  it("fills placeholders", () => {
    expect(fmt("{a} of {b}", { a: 1, b: 2 })).toBe("1 of 2");
  });
});
