import { describe, it, expect } from "vitest";
import {
  validateSearchRequest,
  validateMatchRequest,
  parseIntParam,
  MAX_LIMIT,
} from "../../src/validators/itemSearchValidator.js";

describe("validateSearchRequest", () => {
  it("accepts a query with optional paging", () => {
    expect(validateSearchRequest({ q: "black tee" })).toBeNull();
    expect(validateSearchRequest({ q: "black tee", limit: 5, offset: 10 })).toBeNull();
  });

  it("rejects a missing, empty or overlong query", () => {
    expect(validateSearchRequest({})).toMatch(/required/);
    expect(validateSearchRequest({ q: " " })).toMatch(/required/);
    expect(validateSearchRequest({ q: ["a", "b"] })).toMatch(/required/);
    expect(validateSearchRequest({ q: "x".repeat(201) })).toMatch(/200 characters/);
  });

  it("rejects bad paging", () => {
    expect(validateSearchRequest({ q: "a", limit: 0 })).toMatch(/limit/);
    expect(validateSearchRequest({ q: "a", limit: MAX_LIMIT + 1 })).toMatch(/limit/);
    expect(validateSearchRequest({ q: "a", limit: NaN })).toMatch(/limit/);
    expect(validateSearchRequest({ q: "a", offset: -1 })).toMatch(/offset/);
  });
});

describe("validateMatchRequest", () => {
  it("accepts every attribute with a valid value", () => {
    expect(
      validateMatchRequest({
        attributes: { category: "top", color: "light blue", style: "smart_casual", pattern: "striped", occasion: "work", season: "winter" },
        limit: 10,
      })
    ).toBeNull();
  });

  it("rejects unknown attributes and invalid values", () => {
    expect(validateMatchRequest({ attributes: { brand: "x" } })).toMatch(/Unknown attribute/);
    expect(validateMatchRequest({ attributes: { season: "monsoon" } })).toMatch(/Invalid season/);
    expect(validateMatchRequest({ attributes: { occasion: "wedding" } })).toMatch(/Invalid occasion/);
    expect(validateMatchRequest({ attributes: { pattern: "polka" } })).toMatch(/Invalid pattern/);
  });

  it("rejects missing or empty attributes", () => {
    expect(validateMatchRequest({})).toMatch(/must be an object/);
    expect(validateMatchRequest({ attributes: [] })).toMatch(/must be an object/);
    expect(validateMatchRequest({ attributes: {} })).toMatch(/at least one/);
  });
});

describe("parseIntParam", () => {
  it("parses whole numbers and flags anything else", () => {
    expect(parseIntParam(undefined)).toBeUndefined();
    expect(parseIntParam("10")).toBe(10);
    expect(parseIntParam("1.5")).toBeNaN();
    expect(parseIntParam("-1")).toBeNaN();
    expect(parseIntParam("abc")).toBeNaN();
  });
});
