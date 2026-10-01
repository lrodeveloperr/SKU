import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  allowedActionOrigins: [
    "exact-search-guard.worksbienstudios.com",
    "exact-search-guard-production.up.railway.app",
    "admin.shopify.com",
    "*.myshopify.com",
  ],
} satisfies Config;
