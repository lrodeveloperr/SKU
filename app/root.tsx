import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, type LinksFunction, type LoaderFunctionArgs } from "react-router";
import appStorePreviewStyles from "./app-store-preview.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: appStorePreviewStyles }];

const APP_BRIDGE_URL = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
const POLARIS_URL = "https://cdn.shopify.com/shopifycloud/polaris.js";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  // App Bridge needs to load from the document head before route effects inspect window.shopify.
  return {
    appBridgeApiKey: url.pathname.startsWith("/app") ? process.env.SHOPIFY_API_KEY || "" : "",
  };
};

export default function App() {
  const { appBridgeApiKey } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        {appBridgeApiKey && <script src={APP_BRIDGE_URL} data-api-key={appBridgeApiKey} />}
        {appBridgeApiKey && <script src={POLARIS_URL} />}
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
