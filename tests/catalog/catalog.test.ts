import { describe, expect, it } from "vitest";
import { collectBulkProducts, readLines } from "../../app/domain/catalog/queries";
import { productFromGql, toEntryRows, toVariantRows } from "../../app/domain/catalog/records";

async function* lines(text: string) {
  for (const l of text.split("\n")) yield l;
}

const jsonl = [
  { id: "gid://shopify/Product/1", handle: "p1", title: "P1", status: "ACTIVE", onlineStoreUrl: "https://x/p1", updatedAt: "2026-09-01T00:00:00Z", productModel: { value: "MODEL-1" } },
  { id: "gid://shopify/ProductVariant/11", legacyResourceId: "11", title: "Red", sku: "SKU-11", barcode: " 0123 ", inventoryQuantity: 3, inventoryPolicy: "DENY", __parentId: "gid://shopify/Product/1" },
  { id: "gid://shopify/ProductVariant/12", legacyResourceId: "12", title: "Blue", sku: "", barcode: null, inventoryQuantity: 0, inventoryPolicy: "CONTINUE", variantModel: { value: "VM-12" }, __parentId: "gid://shopify/Product/1" },
  { id: "gid://shopify/Product/2", handle: "p2", title: "P2", status: "ACTIVE", onlineStoreUrl: null, updatedAt: "2026-09-02T00:00:00Z" },
  { id: "gid://shopify/ProductVariant/21", legacyResourceId: "21", title: "Default", sku: "SKU-21", inventoryQuantity: 0, inventoryPolicy: "DENY", __parentId: "gid://shopify/Product/2" },
]
  .map((o) => JSON.stringify(o))
  .join("\n");

describe("bulk import parsing", () => {
  it("regroups flattened JSONL into products with their variants", async () => {
    const grouped = await collectBulkProducts(lines(jsonl));
    expect(grouped.map((g) => g.variants.length)).toEqual([2, 1]);
  });

  it("tolerates children written before their parent and blank lines", async () => {
    const reversed = jsonl.split("\n").reverse().join("\n") + "\n\n";
    const grouped = await collectBulkProducts(lines(reversed));
    expect(grouped.reduce((n, g) => n + g.variants.length, 0)).toBe(3);
  });

  it("streams lines across arbitrary chunk boundaries", async () => {
    const bytes = new TextEncoder().encode("ab\ncd\nlast");
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, 4)); // splits "cd" mid-line
        c.enqueue(bytes.slice(4));
        c.close();
      },
    });
    const out: string[] = [];
    for await (const l of readLines(body)) out.push(l);
    expect(out).toEqual(["ab", "cd", "last"]);
  });
});

describe("records", () => {
  it("builds variant and identifier rows with trimming, stock and model fallback", async () => {
    const grouped = await collectBulkProducts(lines(jsonl));
    const [first, second] = grouped.map((g) => productFromGql(g.product, g.variants));

    const variants = toVariantRows(first!);
    expect(variants.map((v) => [v.legacyId, v.sku, v.barcode, v.inStock, v.published])).toEqual([
      ["11", "SKU-11", "0123", true, true],
      ["12", null, null, true, true], // out of stock but sellable by policy
    ]);

    const entries = toEntryRows(first!).map((e) => `${e.variantId.split("/").pop()}:${e.type}:${e.spaced}`);
    expect(entries.sort()).toEqual(["11:BARCODE:0123", "11:MODEL:model-1", "11:SKU:sku-11", "12:MODEL:vm-12"]);

    expect(toVariantRows(second!)[0]).toMatchObject({ published: false, inStock: false });
  });

  it("does not index non-active products", async () => {
    const { insertProducts } = await import("../../app/services/catalog-store.server");
    const created: unknown[] = [];
    const tx = {
      catalogVariant: { createMany: async (a: unknown) => created.push(a) },
      identifierEntry: { createMany: async (a: unknown) => created.push(a) },
    };
    const product = productFromGql(
      { id: "gid://shopify/Product/9", handle: "h", title: "T", status: "ARCHIVED", updatedAt: "2026-01-01T00:00:00Z" },
      [{ id: "gid://shopify/ProductVariant/9", legacyResourceId: 9, title: "D", sku: "S-9" }],
    );
    expect(await insertProducts(tx as never, "shop", [product], new Date())).toEqual({ variants: 0, entries: 0 });
    expect(created).toEqual([]);
  });
});
