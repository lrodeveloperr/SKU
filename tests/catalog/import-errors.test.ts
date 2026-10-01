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
});

describe("startCatalogImport", () => {
  it("rethrows Shopify response control flow instead of storing it as a failed import", async () => {
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
    const response = new Response("reauth", { status: 302, statusText: "Found" });

    await expect(
      startCatalogImport(
        db as never,
        { graphql: async () => { throw response; } },
        { id: "shop-1", modelMetafieldNamespace: null, modelMetafieldKey: null } as never,
      ),
    ).rejects.toBe(response);
    expect(updates).toEqual([]);
  });
});
