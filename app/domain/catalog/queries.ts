import type { GqlProduct, GqlVariant } from "./records";

export interface ModelMetafield {
  namespace: string;
  key: string;
}

function metafield(alias: string, model: ModelMetafield | null): string {
  return model
    ? `${alias}: metafield(namespace: ${JSON.stringify(model.namespace)}, key: ${JSON.stringify(model.key)}) { value }`
    : "";
}

const variantFields = (model: ModelMetafield | null) => `
  id
  legacyResourceId
  title
  sku
  barcode
  availableForSale
  ${metafield("variantModel", model)}`;

const productScalars = (model: ModelMetafield | null) => `
  id
  handle
  title
  status
  onlineStoreUrl
  updatedAt
  ${metafield("productModel", model)}`;

/** Inner query handed to bulkOperationRunQuery: every active product with its variants. */
export function bulkProductsQuery(model: ModelMetafield | null): string {
  return `{
  products(query: "status:active") {
    edges {
      node {
        ${productScalars(model)}
        variants {
          edges {
            node {
              ${variantFields(model)}
            }
          }
        }
      }
    }
  }
}`;
}

export const START_BULK_MUTATION = `#graphql
  mutation StartBulk($query: String!) {
    bulkOperationRunQuery(query: $query) {
      bulkOperation { id status }
      userErrors { field message }
    }
  }`;

export const BULK_OPERATION_QUERY = `#graphql
  query BulkOperation($id: ID!) {
    node(id: $id) {
      ... on BulkOperation { id status errorCode url objectCount }
    }
  }`;

export function productQuery(model: ModelMetafield | null): string {
  return `#graphql
  query Product($id: ID!, $after: String) {
    product(id: $id) {
      ${productScalars(model)}
      variants(first: 250, after: $after) {
        nodes { ${variantFields(model)} }
        pageInfo { hasNextPage endCursor }
      }
    }
  }`;
}

export const PRODUCT_IDS_QUERY = `#graphql
  query ProductIds($after: String) {
    products(first: 250, after: $after, query: "status:active") {
      nodes { id updatedAt }
      pageInfo { hasNextPage endCursor }
    }
  }`;

// ---------------------------------------------------------------------------
// Bulk JSONL
// ---------------------------------------------------------------------------

interface BulkLine {
  id?: string;
  __parentId?: string;
  [key: string]: unknown;
}

/**
 * Groups the flattened bulk JSONL back into products. Child lines carry
 * `__parentId`; a variant line is any child whose id is a ProductVariant.
 */
export async function collectBulkProducts(
  lines: AsyncIterable<string>,
): Promise<Array<{ product: GqlProduct; variants: GqlVariant[] }>> {
  const products = new Map<string, { product: GqlProduct; variants: GqlVariant[] }>();
  const orphans: Array<{ parent: string; variant: GqlVariant }> = [];

  for await (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const obj = JSON.parse(line) as BulkLine;
    if (typeof obj.id !== "string") continue;

    if (obj.__parentId) {
      if (!obj.id.includes("/ProductVariant/")) continue;
      const entry = products.get(obj.__parentId);
      if (entry) entry.variants.push(obj as unknown as GqlVariant);
      else orphans.push({ parent: obj.__parentId, variant: obj as unknown as GqlVariant });
    } else if (obj.id.includes("/Product/")) {
      products.set(obj.id, { product: obj as unknown as GqlProduct, variants: [] });
    }
  }
  // Children are normally written after their parent; tolerate the reverse.
  for (const { parent, variant } of orphans) products.get(parent)?.variants.push(variant);
  return [...products.values()];
}

/** Splits a streamed response body into lines without buffering the whole file. */
export async function* readLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      yield buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
    }
    if (done) break;
  }
  if (buffer.length > 0) yield buffer;
}
