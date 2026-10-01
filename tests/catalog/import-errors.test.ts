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
});
