import { useRouteLoaderData } from "react-router";
import { messages, toLocale, type Locale } from "./index";

/** Messages for the shop's merchant-interface language; set by the `app` layout loader. */
export function useT() {
  const data = useRouteLoaderData("routes/app") as { locale?: string } | undefined;
  const locale: Locale = toLocale(data?.locale);
  return { t: messages[locale], locale };
}
