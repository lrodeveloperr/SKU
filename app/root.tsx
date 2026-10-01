import { Links, Meta, Outlet, Scripts, ScrollRestoration, type LinksFunction } from "react-router";
import worksbienStyles from "./worksbien.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: worksbienStyles }];

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
