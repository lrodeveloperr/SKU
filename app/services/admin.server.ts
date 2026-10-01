/** The slice of Shopify's `admin` context that the services use. */
export interface AdminClient {
  graphql(
    query: string,
    options?: { variables?: Record<string, unknown> },
  ): Promise<{ json(): Promise<any> }>;
}

export class AdminApiError extends Error {}

function formatGraphQLError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = "message" in error ? (error as { message?: unknown }).message : undefined;
    const path = "path" in error ? (error as { path?: unknown }).path : undefined;
    const pathText = Array.isArray(path) ? ` (${path.join(".")})` : "";
    if (typeof message === "string") return `${message}${pathText}`;
  }
  return JSON.stringify(error);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof Response !== "undefined" && error instanceof Response) {
    return `HTTP ${error.status}${error.statusText ? ` ${error.statusText}` : ""}`;
  }
  return String(error);
}

export function isThrownResponse(error: unknown): error is Response {
  return typeof Response !== "undefined" && error instanceof Response;
}

/** Runs a query and returns `data`, throwing on GraphQL-level errors. */
export async function adminQuery<T = any>(
  admin: AdminClient,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await admin.graphql(query, variables ? { variables } : undefined);
  const body = await response.json();
  if (body.errors && (!Array.isArray(body.errors) || body.errors.length > 0)) {
    const errors = Array.isArray(body.errors) ? body.errors.map(formatGraphQLError).join("; ") : formatGraphQLError(body.errors);
    throw new AdminApiError(`Admin API error: ${errors.slice(0, 500)}`);
  }
  return body.data as T;
}
