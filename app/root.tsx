import { Links, Meta, Outlet, Scripts, ScrollRestoration, type LinksFunction } from "react-router";
import appStorePreviewStyles from "./app-store-preview.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: appStorePreviewStyles }];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
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
