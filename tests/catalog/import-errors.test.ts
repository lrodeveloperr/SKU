import { describe, expect, it } from "vitest";
import { adminQuery } from "../../app/services/admin.server";
import { startCatalogImport } from "../../app/services/catalog-import.server";

describe("adminQuery", () => {
  it("formats GraphQL errors into readable messages", async () => {
    await expect(
      adminQuery(
        {
          graphql: async () => ({
            json: async () => ({
              errors: [{ message: "Access denied", path: ["products", "edges"] }],
            }),
          }),
        },
        "query { products { edges { node { id } } } }",
      ),
    ).rejects.toThrow("Admin API error: Access denied (products.edges)");
  });

  it("formats thrown Shopify HTTP responses into readable messages", async () => {
    await expect(
      adminQuery(
        {
          graphql: async () => {
            throw new Response(JSON.stringify({ errors: "bad query" }), { status: 400, statusText: "Bad Request" });
          },
        },
        "query { nope }",
      ),
    ).rejects.toThrow('Admin API HTTP 400 Bad Request: {"errors":"bad query"}');
  });
});

describe("startCatalogImport", () => {
  it("stores readable Shopify response failures instead of [object Response]", async () => {
    const updates: unknown[] = [];
    const db = {
      syncJob: {
        create: async () => ({ id: "job-1" }),
        update: async (args: unknown) => updates.push(args),
      },
      shop: {
        update: async (args: unknown) => updates.push(args),
        findUnique: async () => ({ id: "shop-1", lastSyncedAt: null }),
      },
    };

    await expect(
      startCatalogImport(
        db as never,
        { graphql: async () => { throw new Response("bad query", { status: 400, statusText: "Bad Request" }); } },
        { id: "shop-1", modelMetafieldNamespace: null, modelMetafieldKey: null } as never,
      ),
    ).resolves.toEqual({ error: "Admin API HTTP 400 Bad Request: bad query" });
    expect(updates).toContainEqual({
      where: { id: "job-1" },
      data: expect.objectContaining({ status: "FAILED", error: "Admin API HTTP 400 Bad Request: bad query" }),
    });
  });

  it("falls back to paged reads when Shopify forbids bulk operations", async () => {
    const updates: unknown[] = [];
    const created: unknown[] = [];
    const tx = {
      catalogVariant: {
        findMany: async () => [],
        deleteMany: async () => undefined,
        createMany: async (args: unknown) => created.push(args),
      },
      identifierEntry: {
        createMany: async (args: unknown) => created.push(args),
      },
    };
    const db = {
      syncJob: {
        create: async () => ({ id: "job-1", startedAt: new Date("2026-01-01T00:00:00Z") }),
        update: async (args: unknown) => {
          updates.push(args);
          return args;
        },
      },
      shop: {
        update: async (args: unknown) => {
          updates.push(args);
          return args;
        },
      },
      $transaction: async (arg: unknown) => (typeof arg === "function" ? (arg as (tx: unknown) => unknown)(tx) : Promise.all(arg as Promise<unknown>[])),
    };
    let calls = 0;

    await expect(
      startCatalogImport(
        db as never,
        {
          graphql: async () => {
            calls += 1;
            if (calls === 1) throw new Response("forbidden", { status: 403, statusText: "Forbidden" });
            if (calls === 2) {
              return {
                json: async () => ({
                  data: {
                    products: {
                      nodes: [{ id: "gid://shopify/Product/1", updatedAt: "2026-01-02T00:00:00Z" }],
                      pageInfo: { hasNextPage: false, endCursor: null },
                    },
                  },
                }),
              };
            }
            return {
              json: async () => ({
                data: {
                  product: {
                    id: "gid://shopify/Product/1",
                    handle: "widget",
                    title: "Widget",
                    status: "ACTIVE",
                    onlineStoreUrl: "https://example.com/products/widget",
                    updatedAt: "2026-01-02T00:00:00Z",
                    variants: {
                      nodes: [{ id: "gid://shopify/ProductVariant/1", legacyResourceId: "1", title: "Default", sku: "SKU-1", availableForSale: true }],
                      pageInfo: { hasNextPage: false, endCursor: null },
                    },
                  },
                },
              }),
            };
          },
        },
        { id: "shop-1", domain: "test.myshopify.com", modelMetafieldNamespace: null, modelMetafieldKey: null } as never,
      ),
    ).resolves.toEqual({ jobId: "job-1" });

    expect(created).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ data: [expect.objectContaining({ sku: "SKU-1", shopId: "shop-1" })] }),
        expect.objectContaining({ data: [expect.objectContaining({ original: "SKU-1", shopId: "shop-1" })] }),
      ]),
    );
    expect(updates).toContainEqual({
      where: { id: "shop-1" },
      data: expect.objectContaining({ syncState: "READY", syncError: null }),
    });
  });
});
