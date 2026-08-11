import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type {
  Gallery,
  GalleryInput,
  GalleryItem,
  GalleryItemInput,
  GalleryUpdateInput,
} from "./gallery.types.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  delete: () => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: unknown[]) => QueryBuilder;
  insert: (values: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  neq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
  upsert: (values: unknown, options?: { onConflict?: string }) => QueryBuilder;
};

type GalleryServiceClient = Pick<SupabaseClient, "from">;

type GalleryRow = {
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
  description: string | null;
  id: string;
  name: string;
  slug: string;
  status: string;
  updated_at: string;
  updated_by: string | null;
};

type GalleryItemRow = {
  alt: string | null;
  caption: string | null;
  created_at: string;
  id: string;
  link_url: string | null;
  media_file_id: string | null;
  sort_order: number;
  title: string | null;
  updated_at: string;
};

const GALLERY_SELECT =
  "id,name,slug,description,status,created_by,updated_by,deleted_at,created_at,updated_at";
const ITEM_SELECT = "id,media_file_id,title,alt,caption,link_url,sort_order,created_at,updated_at";

export class GalleryService {
  private readonly client: GalleryServiceClient;

  constructor(options: { client?: GalleryServiceClient } = {}) {
    this.client = options.client ?? supabase;
  }

  async listGalleries(): Promise<Gallery[]> {
    const result = (await this.from("galleries")
      .select(GALLERY_SELECT)
      .neq("status", "deleted")
      .order("created_at", { ascending: false })) as SupabaseQueryResult<GalleryRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list galleries.", {
        code: "galleries_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rows = result.data ?? [];
    const itemMap = await this.loadItems(rows.map((row) => row.id));

    return rows.map((row) => toGallery(row, itemMap.get(row.id) ?? []));
  }

  async getGallery(galleryId: string): Promise<Gallery> {
    const row = await this.loadGallery(galleryId);
    const items = await this.loadItems([galleryId]);

    return toGallery(row, items.get(galleryId) ?? []);
  }

  async createGallery(input: GalleryInput): Promise<Gallery> {
    const result = await this.from("galleries")
      .insert({
        created_by: input.createdBy ?? null,
        description: input.description ?? null,
        name: input.name,
        slug: input.slug,
        status: input.status ?? "draft",
        updated_by: input.createdBy ?? null,
      })
      .select(GALLERY_SELECT)
      .maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Unable to create gallery.", {
        code: "gallery_create_failed",
        details: { cause: result.error?.message },
        statusCode: 500,
      });
    }

    const gallery = result.data as GalleryRow;
    await this.replaceItems(gallery.id, input.items ?? [], input.createdBy ?? null);

    return this.getGallery(gallery.id);
  }

  async updateGallery(galleryId: string, input: GalleryUpdateInput): Promise<Gallery> {
    const patch = {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.updatedBy !== undefined ? { updated_by: input.updatedBy } : {}),
    };

    if (Object.keys(patch).length > 0) {
      const result = await this.from("galleries").update(patch).eq("id", galleryId);

      if (result.error) {
        throw new HttpError("Unable to update gallery.", {
          code: "gallery_update_failed",
          details: { cause: result.error.message },
          statusCode: 500,
        });
      }
    }

    if (input.items !== undefined) {
      await this.replaceItems(galleryId, input.items, input.updatedBy ?? null);
    }

    return this.getGallery(galleryId);
  }

  async deleteGallery(galleryId: string, userId: string | null): Promise<Gallery> {
    const result = await this.from("galleries")
      .update({ deleted_at: new Date().toISOString(), status: "deleted", updated_by: userId })
      .eq("id", galleryId);

    if (result.error) {
      throw new HttpError("Unable to delete gallery.", {
        code: "gallery_delete_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const row = await this.loadGallery(galleryId, true);

    return toGallery(row, []);
  }

  private async loadGallery(galleryId: string, includeDeleted = false): Promise<GalleryRow> {
    let query = this.from("galleries").select(GALLERY_SELECT).eq("id", galleryId);

    if (!includeDeleted) {
      query = query.neq("status", "deleted");
    }

    const result = await query.maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load gallery.", {
        code: "gallery_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Gallery was not found.", { code: "gallery_not_found", statusCode: 404 });
    }

    return result.data as GalleryRow;
  }

  private async loadItems(galleryIds: string[]): Promise<Map<string, GalleryItem[]>> {
    const map = new Map<string, GalleryItem[]>();

    if (galleryIds.length === 0) {
      return map;
    }

    const result = (await this.from("gallery_items")
      .select(`${ITEM_SELECT},gallery_id`)
      .in("gallery_id", galleryIds)
      .order("sort_order", { ascending: true })) as SupabaseQueryResult<
      Array<GalleryItemRow & { gallery_id: string }>
    >;

    if (result.error) {
      throw new HttpError("Unable to load gallery items.", {
        code: "gallery_items_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    for (const row of result.data ?? []) {
      map.set(row.gallery_id, [...(map.get(row.gallery_id) ?? []), toGalleryItem(row)]);
    }

    return map;
  }

  private async replaceItems(galleryId: string, items: GalleryItemInput[], userId: string | null) {
    const deleteResult = await this.from("gallery_items").delete().eq("gallery_id", galleryId);

    if (deleteResult.error) {
      throw new HttpError("Unable to replace gallery items.", {
        code: "gallery_items_replace_failed",
        details: { cause: deleteResult.error.message },
        statusCode: 500,
      });
    }

    if (items.length === 0) {
      return;
    }

    const insertResult = await this.from("gallery_items").insert(
      items.map((item, index) => ({
        alt: item.alt ?? null,
        caption: item.caption ?? null,
        created_by: userId,
        gallery_id: galleryId,
        link_url: item.linkUrl ?? null,
        media_file_id: item.mediaFileId ?? null,
        sort_order: item.sortOrder ?? index,
        title: item.title ?? null,
        updated_by: userId,
      })),
    );

    if (insertResult.error) {
      throw new HttpError("Unable to save gallery items.", {
        code: "gallery_items_save_failed",
        details: { cause: insertResult.error.message },
        statusCode: 500,
      });
    }
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const galleryService = new GalleryService();

function toGallery(row: GalleryRow, items: GalleryItem[]): Gallery {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    description: row.description,
    id: row.id,
    items,
    name: row.name,
    slug: row.slug,
    status: row.status,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function toGalleryItem(row: GalleryItemRow): GalleryItem {
  return {
    alt: row.alt,
    caption: row.caption,
    createdAt: row.created_at,
    id: row.id,
    linkUrl: row.link_url,
    mediaFileId: row.media_file_id,
    sortOrder: row.sort_order,
    title: row.title,
    updatedAt: row.updated_at,
  };
}
