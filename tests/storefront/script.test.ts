// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const source = readFileSync("extensions/exact-search-guard/assets/exact-search-guard.js", "utf8");

const added: Array<[string, EventListenerOrEventListenerObject, any]> = [];
const realAdd = document.addEventListener.bind(document);
document.addEventListener = ((type: string, fn: any, opts?: any) => {
  added.push([type, fn, opts]);
  realAdd(type, fn, opts);
}) as typeof document.addEventListener;

type Api = { navigate: (u: string) => void; isEligible: (q: string) => boolean };
const api = () => (window as unknown as { ExactSearchGuard: Api }).ExactSearchGuard;

function load() {
  delete (window as any).ExactSearchGuard;
  // Each load registers a fresh capture listener on a fresh document.
  new Function(source)();
}

let nativeSubmits: number;
let navigated: string[];

function cleanup() {
  for (const [type, fn, opts] of added.splice(0)) document.removeEventListener(type, fn, opts);
}

function setup(formHtml = '<form action="/search" method="get"><input name="q" value="AB-123"><button>Go</button></form>') {
  cleanup();
  document.body.innerHTML = formHtml;
  nativeSubmits = 0;
  navigated = [];
  // Counts submissions that reach the bubble phase, i.e. native search going ahead.
  document.addEventListener("submit", (e) => {
    if (e.defaultPrevented) return; // intercepted by the script
    nativeSubmits += 1;
    e.preventDefault(); // jsdom cannot navigate
  });
  load();
  api().navigate = (u) => navigated.push(u);
}

const reply = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }));

const submit = async (form = document.querySelector("form")!) => {
  form.requestSubmit();
  await new Promise((r) => setTimeout(r, 20));
};

beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
  // Fresh document listeners between tests.
  document.body.innerHTML = "";
});

describe("storefront script", () => {
  it("redirects to the product on a unique exact match", async () => {
    setup();
    globalThis.fetch = reply({ v: 1, status: "match", matches: [{ url: "/products/widget?variant=12", title: "W", variantTitle: "R", inStock: true }] }) as any;
    await submit();
    expect(navigated).toEqual(["/products/widget?variant=12"]);
    expect(nativeSubmits).toBe(0);
  });

  it("submits the original form unchanged when nothing matches", async () => {
    setup();
    globalThis.fetch = reply({ v: 1, status: "none", reason: "not_found" }) as any;
    await submit();
    expect(navigated).toEqual([]);
    expect(nativeSubmits).toBe(1);
    expect((document.querySelector("input") as HTMLInputElement).value).toBe("AB-123");
  });

  it("falls back on network failure, HTTP errors, malformed bodies and timeouts", async () => {
    for (const impl of [
      vi.fn(async () => { throw new Error("offline"); }),
      reply({}, false),
      reply({ v: 2, status: "match" }),
      reply({ v: 1, status: "match", matches: [] }),
      vi.fn(() => new Promise(() => {})), // never resolves
    ]) {
      setup();
      globalThis.fetch = impl as any;
      await submit();
      await new Promise((r) => setTimeout(r, 170));
      expect(nativeSubmits).toBe(1);
      expect(navigated).toEqual([]);
    }
  });

  it("never redirects to an off-site or non-product URL", async () => {
    for (const url of ["https://evil.example/products/x", "//evil.example", "/cart", "javascript:alert(1)", "/products/a/b"]) {
      setup();
      globalThis.fetch = reply({ v: 1, status: "match", matches: [{ url, title: "x" }] }) as any;
      await submit();
      expect(navigated).toEqual([]);
      expect(nativeSubmits).toBe(1);
    }
  });

  it("intercepts each submission only once (no loop after fallback)", async () => {
    setup();
    const fetchMock = reply({ v: 1, status: "none" });
    globalThis.fetch = fetchMock as any;
    await submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(nativeSubmits).toBe(1);
  });

  it("ignores queries that are not identifier-like, other methods and other actions", async () => {
    for (const html of [
      '<form action="/search" method="get"><input name="q" value="red running shoes for men"></form>',
      '<form action="/search" method="post"><input name="q" value="AB-123"></form>',
      '<form action="/contact" method="get"><input name="q" value="AB-123"></form>',
      '<form action="/search" method="get"><input name="term" value="AB-123"></form>',
      '<form action="/search" method="get"><input name="q" value=""></form>',
    ]) {
      setup(html);
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as any;
      await submit();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(nativeSubmits).toBe(1);
    }
  });

  it("accepts localized search paths", async () => {
    setup('<form action="/en-ca/search" method="get"><input name="q" value="AB-123"></form>');
    const fetchMock = reply({ v: 1, status: "none" });
    globalThis.fetch = fetchMock as any;
    await submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows an accessible chooser for several matches and can fall back to native search", async () => {
    setup();
    globalThis.fetch = reply({
      v: 1,
      status: "multiple",
      matches: [
        { url: "/products/a?variant=1", title: "A", variantTitle: "Red", inStock: true },
        { url: "/products/b?variant=2", title: "B", variantTitle: "Default Title", inStock: false },
      ],
    }) as any;
    await submit();

    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const links = [...dialog.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/products/a?variant=1", "/products/b?variant=2"]);
    expect(dialog.textContent).toContain("Sold out");
    expect(dialog.textContent).not.toContain("Default Title");
    expect(nativeSubmits).toBe(0);

    (dialog.querySelectorAll("button")[0] as HTMLButtonElement).click(); // see all results
    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(nativeSubmits).toBe(1);
  });

  it("closes the chooser with Escape without searching", async () => {
    setup();
    globalThis.fetch = reply({ v: 1, status: "multiple", matches: [{ url: "/products/a?variant=1", title: "A" }, { url: "/products/b?variant=2", title: "B" }] }) as any;
    await submit();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(nativeSubmits).toBe(0);
  });

  it("passes preview=1 once the merchant has opted in", async () => {
    sessionStorage.setItem("esg_preview", "1");
    setup();
    const fetchMock = reply({ v: 1, status: "none" });
    globalThis.fetch = fetchMock as any;
    await submit();
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe("/apps/exact-search/lookup?q=AB-123&preview=1");
  });
});
