import { redirect, type LoaderFunctionArgs } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) throw redirect(`/app?${url.searchParams.toString()}`);
  return new Response("Exact Search Guard", { headers: { "Content-Type": "text/plain" } });
};
