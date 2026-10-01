import { describe, expect, it } from "vitest";
import { classifyQuery, cleanIdentifierValue, normalizeIdentifier } from "../../app/domain/identifiers/normalize";

describe("normalizeIdentifier", () => {
  it("keeps the original and folds case", () => {
    const n = normalizeIdentifier("AB-123 X");
    expect(n.original).toBe("AB-123 X");
    expect(n.folded).toBe("ab-123 x");
    expect(n.spaced).toBe("ab-123 x");
    expect(n.compact).toBe("ab123x");
  });

  it("collapses whitespace including tabs and non-breaking spaces", () => {
    expect(normalizeIdentifier("  ab \t  12 ").spaced).toBe("ab 12");
  });

  it("applies NFKC so full-width and ligature forms match", () => {
    expect(normalizeIdentifier("ＡＢ－１２").folded).toBe("ab-12");
    expect(normalizeIdentifier("ﬁt-1").folded).toBe("fit-1");
  });

  it("treats every dash variant, underscore, dot and slash as a separator in the compact form", () => {
    for (const sep of ["-", "‐", "‑", "–", "—", "−", "_", ".", "/", "\\", " "]) {
      expect(normalizeIdentifier(`AB${sep}12`).compact).toBe("ab12");
    }
  });

  it("does not strip other punctuation, so materially different codes stay different", () => {
    expect(normalizeIdentifier("AB+12").compact).toBe("ab+12");
    expect(normalizeIdentifier("AB#12").compact).toBe("ab#12");
  });
});

describe("classifyQuery", () => {
  it.each(["AB-123", "123456789012", "ab 123", "X1", "WIDGET", "A/B.12"])("accepts %s", (q) => {
    expect(classifyQuery(q).eligible).toBe(true);
  });

  it.each(["", "   ", "red running shoes for men", "ford focus 2012", "a".repeat(65), "<script>", "AB;DROP", "%00"])(
    "rejects %j",
    (q) => {
      expect(classifyQuery(q).eligible).toBe(false);
    },
  );

  it("marks only digit-bearing queries as identifier shaped", () => {
    expect(classifyQuery("AB-123").identifierShaped).toBe(true);
    expect(classifyQuery("shoes").identifierShaped).toBe(false);
    expect(classifyQuery("shoes").eligible).toBe(true);
  });
});

describe("cleanIdentifierValue", () => {
  it("drops empty, null and oversized values and trims the rest", () => {
    expect(cleanIdentifierValue(null)).toBeNull();
    expect(cleanIdentifierValue("   ")).toBeNull();
    expect(cleanIdentifierValue("x".repeat(256))).toBeNull();
    expect(cleanIdentifierValue("  ab-1 ")).toBe("ab-1");
  });
});
