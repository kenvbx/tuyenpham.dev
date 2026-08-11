import { describe, expect, it } from "vitest";

import { sanitizeHtml, sanitizeNullableHtml } from "./html-sanitizer.js";

describe("HTML sanitizer", () => {
  it("removes scriptable markup while preserving safe editor content", () => {
    expect(
      sanitizeHtml(
        '<p onclick="alert(1)">Hello <strong>CMS</strong></p><script>alert(1)</script><a href="javascript:alert(1)">Bad</a>',
      ),
    ).toBe("<p>Hello <strong>CMS</strong></p>alert(1)<a>Bad</a>");
  });

  it("keeps null and undefined HTML fields stable", () => {
    expect(sanitizeNullableHtml(null)).toBeNull();
    expect(sanitizeNullableHtml(undefined)).toBeUndefined();
  });
});
