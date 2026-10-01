import { timingSafeEqual } from "node:crypto";
import type { ActionFunctionArgs } from "react-router";
import { unauthenticated } from "../shopify.server";
import { db } from "../db.server";
import { runNightlyJobs } from "../services/jobs.server";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** POST with `Authorization: Bearer $CRON_SECRET`, called nightly by a scheduler. */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  const report = await runNightlyJobs(db, async (domain) => (await unauthenticated.admin(domain)).admin);
  return Response.json(report);
};
