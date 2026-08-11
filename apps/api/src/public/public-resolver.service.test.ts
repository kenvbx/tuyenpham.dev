import { describe, expect, it, vi } from "vitest";

import { PublicResolverService } from "./public-resolver.service.js";

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function createClient(results: QueryResult[]) {
  const calls: Array<{ column?: string; table: string; type: "select" | "eq"; value?: unknown }> =
    [];
  const queue = [...results];

  const from = vi.fn((table: string) => {
    const query = {
      eq: vi.fn((column: string, value: unknown) => {
        calls.push({ column, table, type: "eq", value });

        return query;
      }),
      maybeSingle: vi.fn(async () => {
        const result = queue.shift();

        if (!result) {
          throw new Error(`Missing query result for ${table}`);
        }

        return result;
      }),
      select: vi.fn((column: string) => {
        calls.push({ column, table, type: "select" });

        return query;
      }),
    };

    return query;
  });

  return { calls, client: { from } };
}

describe("PublicResolverService", () => {
  it("resolves a public path to a published page", async () => {
    const { client } = createClient([
      {
        data: {
          id: "10000000-0000-4000-8000-000000000901",
          key: "about",
          locale: "vi",
          prefix: "",
          redirect_to: null,
          reference_id: "10000000-0000-4000-8000-000000000902",
          reference_type: "page",
        },
        error: null,
      },
      {
        data: {
          deleted_at: null,
          excerpt: "About excerpt",
          id: "10000000-0000-4000-8000-000000000902",
          published_at: "2026-08-10T00:00:00.000Z",
          status: "published",
          title: "About",
          updated_at: "2026-08-10T00:00:00.000Z",
        },
        error: null,
      },
    ]);
    const service = new PublicResolverService({ client });

    await expect(service.resolvePath("/about?preview=true")).resolves.toMatchObject({
      entity: {
        id: "10000000-0000-4000-8000-000000000902",
        title: "About",
      },
      path: "/about",
      redirectTo: null,
      type: "page",
    });
  });

  it("returns redirect results without querying the entity table", async () => {
    const { client } = createClient([
      {
        data: {
          id: "10000000-0000-4000-8000-000000000903",
          key: "old-page",
          locale: "vi",
          prefix: "",
          redirect_to: "/new-page",
          reference_id: "10000000-0000-4000-8000-000000000904",
          reference_type: "page",
        },
        error: null,
      },
    ]);
    const service = new PublicResolverService({ client });

    await expect(service.resolvePath("/old-page")).resolves.toMatchObject({
      entity: null,
      redirectTo: "/new-page",
      type: "redirect",
    });
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it("loads categories without selecting a missing slug column", async () => {
    const { calls, client } = createClient([
      {
        data: {
          id: "10000000-0000-4000-8000-000000000905",
          key: "news",
          locale: "vi",
          prefix: "blog",
          redirect_to: null,
          reference_id: "10000000-0000-4000-8000-000000000906",
          reference_type: "category",
        },
        error: null,
      },
      {
        data: {
          deleted_at: null,
          description: "News category",
          id: "10000000-0000-4000-8000-000000000906",
          name: "News",
          status: "published",
          updated_at: "2026-08-10T00:00:00.000Z",
        },
        error: null,
      },
    ]);
    const service = new PublicResolverService({ client });

    await expect(service.resolvePath("/blog/news")).resolves.toMatchObject({
      entity: {
        id: "10000000-0000-4000-8000-000000000906",
        slug: null,
        title: "News",
      },
      slug: { key: "news", prefix: "blog" },
      type: "category",
    });
    expect(calls).toContainEqual({
      column: "id,name,description,status,deleted_at,updated_at",
      table: "categories",
      type: "select",
    });
  });
});
