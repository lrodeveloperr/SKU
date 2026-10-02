import { useEffect } from "react";
import { Outlet, useLoaderData, useNavigate, useRouteError, type HeadersFunction, type LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { requireShop } from "../services/session.server";
import { isScreenshotMode } from "../services/screenshot-mode.server";
import { useT } from "../i18n/use-t";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (isScreenshotMode()) {
    return { locale: "en", screenshotMode: true };
  }
  const { locale } = await requireShop(request);
  return { locale, screenshotMode: false };
};

export default function AppLayout() {
  const { screenshotMode } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useT();

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const href = (event.target as HTMLElement | null)?.getAttribute("href");
      if (href) navigate(href);
    };

    document.addEventListener("shopify:navigate", handleNavigate);
    return () => document.removeEventListener("shopify:navigate", handleNavigate);
  }, [navigate]);

  return (
    <>
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
    </>
  );
}

// Shopify needs React Router to catch thrown responses so it can re-authenticate.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
