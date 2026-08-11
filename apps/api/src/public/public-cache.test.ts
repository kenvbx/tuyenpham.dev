import { describe, expect, it, vi } from "vitest";

import { PublicCache } from "./public-cache.js";

describe("PublicCache", () => {
  it("reuses values until cache is cleared", async () => {
    const cache = new PublicCache(60_000);
    const loader = vi.fn(async () => ({ value: "fresh" }));

    await expect(cache.getOrSet("key", loader)).resolves.toEqual({ value: "fresh" });
    await expect(cache.getOrSet("key", loader)).resolves.toEqual({ value: "fresh" });
    expect(loader).toHaveBeenCalledTimes(1);

    cache.clear();

    await expect(cache.getOrSet("key", loader)).resolves.toEqual({ value: "fresh" });
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
