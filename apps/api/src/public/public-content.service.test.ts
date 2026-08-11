import { describe, expect, it, vi } from "vitest";

import { PublicContentService } from "./public-content.service.js";

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function createClient(results: QueryResult[]) {
  const queue = [...results];
  const from = vi.fn((table: string) => {
    const query = {
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      is: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        const result = queue.shift();

        if (!result) {
          throw new Error(`Missing query result for ${table}`);
        }

        return result;
      }),
      or: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(() => query),
      select: vi.fn(() => query),
      then: vi.fn((resolve: (value: QueryResult) => unknown) => {
        const result = queue.shift();

        if (!result) {
          throw new Error(`Missing query result for ${table}`);
        }

        return Promise.resolve(resolve(result));
      }),
      update: vi.fn(() => query),
    };

    return query;
  });

  return { client: { from }, from };
}

describe("PublicContentService", () => {
  it("does not expose scheduled pages before their publish time", async () => {
    const { client } = createClient([
      {
        data: {
          id: "10000000-0000-4000-8000-000000000910",
          key: "launch",
          locale: "vi",
          prefix: "",
          reference_id: "10000000-0000-4000-8000-000000000911",
        },
        error: null,
      },
      {
        data: {
          author_id: null,
          content_html: "<p>Coming soon</p>",
          content_json: null,
          content_text: "Coming soon",
          content_version: 1,
          deleted_at: null,
          excerpt: null,
          featured_image_id: null,
          id: "10000000-0000-4000-8000-000000000911",
          published_at: "2099-01-01T00:00:00.000Z",
          status: "scheduled",
          title: "Launch",
          updated_at: "2026-08-10T00:00:00.000Z",
        },
        error: null,
      },
    ]);
    const service = new PublicContentService({ client });

    await expect(service.getPageBySlug("launch")).rejects.toMatchObject({
      code: "page_not_found",
      statusCode: 404,
    });
  });

  it("returns public post detail with SEO and increments views", async () => {
    const { client, from } = createClient([
      {
        data: {
          id: "10000000-0000-4000-8000-000000000912",
          key: "first-post",
          locale: "vi",
          prefix: "",
          reference_id: "10000000-0000-4000-8000-000000000913",
        },
        error: null,
      },
      {
        data: {
          author_id: null,
          content_html: "<p>Body</p>",
          content_json: null,
          content_text: "Body",
          content_version: 1,
          deleted_at: null,
          excerpt: "Excerpt",
          featured_image_id: null,
          id: "10000000-0000-4000-8000-000000000913",
          published_at: "2026-08-10T00:00:00.000Z",
          status: "published",
          title: "First post",
          updated_at: "2026-08-10T00:00:00.000Z",
          views_count: 7,
        },
        error: null,
      },
      { data: null, error: null },
      {
        data: {
          canonical_url: null,
          id: "10000000-0000-4000-8000-000000000914",
          meta_description: "SEO description",
          meta_title: "SEO title",
          nofollow: false,
          noindex: false,
          og_description: null,
          og_image_id: null,
          og_image_url: null,
          og_title: null,
          structured_data: {},
        },
        error: null,
      },
      { data: null, error: null },
      { data: null, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ]);
    const service = new PublicContentService({ client });

    await expect(service.getPostBySlug("first-post")).resolves.toMatchObject({
      id: "10000000-0000-4000-8000-000000000913",
      seo: { metaTitle: "SEO title" },
      viewsCount: 8,
    });
    expect(from).toHaveBeenCalledWith("posts");
  });
});
