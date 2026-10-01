import { Outlet, useLoaderData, useRouteError, type HeadersFunction, type LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { requireShop } from "../services/session.server";
import { useT } from "../i18n/use-t";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (process.env.SCREENSHOT_MODE === "1") {
    return { apiKey: process.env.SHOPIFY_API_KEY || "", locale: "en", screenshotMode: true };
  }
  const { locale } = await requireShop(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "", locale, screenshotMode: false };
};

export default function AppLayout() {
  const { apiKey, screenshotMode } = useLoaderData<typeof loader>();
  const { t } = useT();
  return (
    <AppProvider apiKey={apiKey}>
      {!screenshotMode && (
        <s-app-nav>
          <s-link href="/app">{t.nav.overview}</s-link>
          <s-link href="/app/health">{t.nav.health}</s-link>
          <s-link href="/app/diagnostic">{t.nav.diagnostic}</s-link>
          <s-link href="/app/analytics">{t.nav.analytics}</s-link>
          <s-link href="/app/settings">{t.nav.settings}</s-link>
        </s-app-nav>
      )}
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch thrown responses so it can re-authenticate.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
