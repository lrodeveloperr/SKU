import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { db } from "./db.server";
import { ensureShop } from "./services/shops.server";
import { startCatalogImport } from "./services/catalog-import.server";

const DEFAULT_APP_URL = "https://exact-search-guard.worksbienstudios.com";

let shopifyInstance: ReturnType<typeof shopifyApp> | null = null;

function getShopify() {
  if (shopifyInstance) return shopifyInstance;

  shopifyInstance = shopifyApp({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
    // Pinned on purpose; do not use LATEST_API_VERSION in production.
    apiVersion: ApiVersion.July26,
    scopes: process.env.SCOPES?.split(","),
    appUrl: process.env.SHOPIFY_APP_URL || DEFAULT_APP_URL,
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorage(db),
    distribution: AppDistribution.AppStore,
    hooks: {
      afterAuth: async ({ session, admin }) => {
        const shop = await ensureShop(db, session.shop);
        if (shop.syncState === "PENDING" || shop.syncState === "FAILED") {
          await startCatalogImport(db, admin, shop);
        }
      },
    },
  });

  return shopifyInstance;
}

export default getShopify;
export const apiVersion = ApiVersion.July26;
export const authenticate = {
  admin: (...args: Parameters<ReturnType<typeof shopifyApp>["authenticate"]["admin"]>) =>
    getShopify().authenticate.admin(...args),
  webhook: (...args: Parameters<ReturnType<typeof shopifyApp>["authenticate"]["webhook"]>) =>
    getShopify().authenticate.webhook(...args),
  public: {
    appProxy: (...args: Parameters<ReturnType<typeof shopifyApp>["authenticate"]["public"]["appProxy"]>) =>
      getShopify().authenticate.public.appProxy(...args),
  },
};
export const unauthenticated = {
  admin: (...args: Parameters<ReturnType<typeof shopifyApp>["unauthenticated"]["admin"]>) =>
    getShopify().unauthenticated.admin(...args),
};
export const login = (...args: Parameters<ReturnType<typeof shopifyApp>["login"]>) =>
  getShopify().login(...args);
export const sessionStorage = new PrismaSessionStorage(db);
export const addDocumentResponseHeaders: ReturnType<typeof shopifyApp>["addDocumentResponseHeaders"] = (...args) => {
  try {
    return getShopify().addDocumentResponseHeaders(...args);
  } catch {
    return undefined;
  }
};
