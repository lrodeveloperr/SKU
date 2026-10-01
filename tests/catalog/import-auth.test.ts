import { beforeEach, describe, expect, it, vi } from "vitest";
import { startCatalogImportWithSessionRefresh } from "../../app/services/catalog-import-auth.server";

const mocks = vi.hoisted(() => ({
  deleteSession: vi.fn(),
  requireShop: vi.fn(),
}));

vi.mock("../../app/shopify.server", () => ({
  sessionStorage: { deleteSession: mocks.deleteSession },
  unauthenticated: { admin: vi.fn() },
}));

vi.mock("../../app/services/session.server", () => ({
  requireShop: (...args: unknown[]) => mocks.requireShop(...args),
}));

function dbStub() {
  const updates: unknown[] = [];
  const db = {
    syncJob: {
      create: vi.fn(async () => ({ id: `job-${updates.length + 1}`, startedAt: new Date("2026-01-01T00:00:00Z") })),
      update: vi.fn(async (args: unknown) => {
        updates.push(args);
        return args;
      }),
    },
    shop: {
      update: vi.fn(async (args: unknown) => {
        updates.push(args);
        return args;
      }),
      findUnique: vi.fn(async () => ({ id: "shop-1", lastSyncedAt: null })),
    },
  };
  return { db, updates };
}

function successAdmin() {
  return {
    graphql: vi.fn(async () => ({
      json: async () => ({
        data: {
          bulkOperationRunQuery: {
            bulkOperation: { id: "bulk-1", status: "CREATED" },
            userErrors: [],
          },
        },
      }),
    })),
  };
}

function forbiddenAdmin() {
  return {
    graphql: vi.fn(async () => {
      throw new Response(JSON.stringify({ errors: { networkStatusCode: 403, message: "GraphQL Client: Forbidden", response: {} } }), {
        status: 403,
        statusText: "Forbidden",
      });
    }),
  };
}

const shop = {
  id: "shop-1",
  domain: "exact-search-guard-test.myshopify.com",
  modelMetafieldNamespace: null,
  modelMetafieldKey: null,
};

describe("startCatalogImportWithSessionRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the offline admin client for catalog imports", async () => {
    const { db } = dbStub();
    const offline = successAdmin();
    const requestAdmin = forbiddenAdmin();
    const loadOfflineAdmin = vi.fn(async () => offline);

    await expect(
      startCatalogImportWithSessionRefresh(db as never, new Request("https://app.test/app"), requestAdmin, shop as never, loadOfflineAdmin),
    ).resolves.toEqual({ jobId: "job-1" });

    expect(loadOfflineAdmin).toHaveBeenCalledWith(shop.domain);
    expect(offline.graphql).toHaveBeenCalled();
    expect(requestAdmin.graphql).not.toHaveBeenCalled();
  });

  it("deletes a forbidden offline session and retries with a refreshed offline admin", async () => {
    const { db, updates } = dbStub();
    const stale = forbiddenAdmin();
    const refreshed = successAdmin();
    const requestAdmin = forbiddenAdmin();
    const loadOfflineAdmin = vi.fn(async () => (loadOfflineAdmin.mock.calls.length === 1 ? stale : refreshed));
    mocks.requireShop.mockResolvedValue({ admin: requestAdmin, shop });

    await expect(
      startCatalogImportWithSessionRefresh(db as never, new Request("https://app.test/app"), requestAdmin, shop as never, loadOfflineAdmin),
    ).resolves.toEqual({ jobId: "job-3" });

    expect(mocks.deleteSession).toHaveBeenCalledWith(`offline_${shop.domain}`);
    expect(mocks.requireShop).toHaveBeenCalled();
    expect(refreshed.graphql).toHaveBeenCalled();
    expect(updates).toContainEqual({
      where: { id: "shop-1" },
      data: expect.objectContaining({ syncState: "IMPORTING", syncError: null }),
    });
  });
});
