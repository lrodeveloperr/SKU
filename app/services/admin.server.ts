/** The slice of Shopify's `admin` context that the services use. */
export interface AdminClient {
  graphql(
    query: string,
    options?: { variables?: Record<string, unknown> },
  ): Promise<{ json(): Promise<any> }>;
}

export class AdminApiError extends Error {}

/** Runs a query and returns `data`, throwing on GraphQL-level errors. */
export async function adminQuery<T = any>(
  admin: AdminClient,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await admin.graphql(query, variables ? { variables } : undefined);
  const body = await response.json();
  if (body.errors && (!Array.isArray(body.errors) || body.errors.length > 0)) {
    throw new AdminApiError(`Admin API error: ${JSON.stringify(body.errors).slice(0, 500)}`);
  }
  return body.data as T;
}
