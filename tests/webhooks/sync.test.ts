import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { applyProductWebhook, claimWebhook, diffCatalog, productGid } from "../../app/services/catalog-sync.server";
import { replaceProduct } from "../../app/services/catalog-store.server";
import { productFromGql } from "../../app/domain/catalog/records";

describe("claimWebhook", () => {
  const dup = () => new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" });

  it("claims a new delivery", async () => {
    const db = { syncJob: { create: async () => ({}) } } as never;
    expect(await claimWebhook(db, "s", "w1", "PRODUCTS_UPDATE")).toBe(true);
  });

  it("rejects a duplicate that is running or done", async () => {
    const db = { syncJob: { create: async () => { throw dup(); }, updateMany: async () => ({ count: 0 }) } } as never;
    expect(await claimWebhook(db, "s", "w1", "PRODUCTS_UPDATE")).toBe(false);
  });

  it("lets Shopify's retry reclaim a failed delivery", async () => {
    const db = { syncJob: { create: async () => { throw dup(); }, updateMany: async () => ({ count: 1 }) } } as never;
    expect(await claimWebhook(db, "s", "w1", "PRODUCTS_UPDATE")).toBe(true);
  });

  it("propagates unrelated database errors", async () => {
    const db = { syncJob: { create: async () => { throw new Error("boom"); } } } as never;
    await expect(claimWebhook(db, "s", "w1", "t")).rejects.toThrow("boom");
  });
});

describe("product webhooks", () => {
  it("derives the product GID from the payload", () => {
    expect(productGid({ admin_graphql_api_id: "gid://shopify/Product/5" })).toBe("gid://shopify/Product/5");
    expect(productGid({ id: 5 })).toBe("gid://shopify/Product/5");
    expect(productGid({})).toBeNull();
  });

  it("deletes without needing an admin client", async () => {
    const calls: unknown[] = [];
    const db = { $transaction: async (fn: any) => fn({ catalogVariant: { deleteMany: async (a: unknown) => calls.push(a) } }) } as never;
    await applyProductWebhook(db, undefined, { id: "s", domain: "d" } as never, "PRODUCTS_DELETE", { id: 5 });
    expect(calls).toEqual([{ where: { shopId: "s", productId: "gid://shopify/Product/5" } }]);
  });

  it("fails (so Shopify retries) when an update arrives without an admin session", async () => {
    await expect(
      applyProductWebhook({} as never, undefined, { id: "s", domain: "d" } as never, "PRODUCTS_UPDATE", { id: 5 }),
    ).rejects.toThrow(/offline session/);
  });

  it("removes a product that is gone or no longer active when an update is replayed", async () => {
    const deleted: unknown[] = [];
    const db = { $transaction: async (fn: any) => fn({ catalogVariant: { deleteMany: async (a: unknown) => deleted.push(a) } }) } as never;
    const admin = { graphql: async () => ({ json: async () => ({ data: { product: null } }) }) };
    await applyProductWebhook(db, admin, { id: "s", domain: "d" } as never, "PRODUCTS_UPDATE", { id: 5 });
    expect(deleted).toHaveLength(1);
  });
});

describe("replaceProduct ordering guard", () => {
  const product = (updatedAt: string) =>
    productFromGql(
      { id: "gid://shopify/Product/1", handle: "h", title: "T", status: "ACTIVE", updatedAt },
      [{ id: "gid://shopify/ProductVariant/1", legacyResourceId: 1, title: "D", sku: "S-1" }],
    );

  function dbWith(stored: Date | null) {
    const writes: string[] = [];
    const tx = {
      catalogVariant: {
        findFirst: async () => (stored ? { productUpdatedAt: stored } : null),
        deleteMany: async () => void writes.push("delete"),
        createMany: async () => void writes.push("variants"),
      },
      identifierEntry: { createMany: async () => void writes.push("entries") },
    };
    return { writes, db: { $transaction: async (fn: any) => fn(tx) } as never };
  }

  it("ignores a delivery older than what is stored", async () => {
    const { db, writes } = dbWith(new Date("2026-09-02T00:00:00Z"));
    expect(await replaceProduct(db, "s", product("2026-09-01T00:00:00Z"))).toBe(false);
    expect(writes).toEqual([]);
  });

  it("applies equal-or-newer deliveries and is safe to replay", async () => {
    const { db, writes } = dbWith(new Date("2026-09-01T00:00:00Z"));
    expect(await replaceProduct(db, "s", product("2026-09-01T00:00:00Z"))).toBe(true);
    expect(writes).toEqual(["delete", "variants", "entries"]);
  });
});

describe("diffCatalog", () => {
  it("finds missing, stale and orphaned products", () => {
    const t = (d: string) => new Date(`2026-09-0${d}T00:00:00Z`);
    const remote = new Map([["a", t("2")], ["b", t("1")], ["c", t("3")]]);
    const local = new Map([["a", t("1")], ["b", t("1")], ["z", t("1")]]);
    expect(diffCatalog(remote, local)).toEqual({ stale: ["a", "c"], orphaned: ["z"] });
  });
});
