import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { slugService, type SlugService } from "../slugs/slug.service.js";
import { supabase } from "../supabase/client.js";
import type {
  Category,
  CategoryInput,
  CategoryReorderItem,
  CategoryUpdateInput,
} from "./category.types.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  insert: (values: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  neq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
};

type CategoryServiceClient = Pick<SupabaseClient, "from">;

type CategoryRow = {
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
  description: string | null;
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  status: string;
  updated_at: string;
  updated_by: string | null;
};

type SlugRow = {
  key: string;
  reference_id: string;
};

const CATEGORY_SELECT =
  "id,name,description,parent_id,sort_order,status,created_by,updated_by,deleted_at,created_at,updated_at";

export class CategoryService {
  private readonly client: CategoryServiceClient;
  private readonly slugs: SlugService;

  constructor(options: { client?: CategoryServiceClient; slugs?: SlugService } = {}) {
    this.client = options.client ?? supabase;
    this.slugs = options.slugs ?? slugService;
  }

  async listCategories(): Promise<Category[]> {
    const result = (await this.from("categories")
      .select(CATEGORY_SELECT)
      .neq("status", "deleted")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })) as SupabaseQueryResult<CategoryRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list categories.", {
        code: "categories_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rows = result.data ?? [];
    const slugs = await this.loadSlugs(rows.map((row) => row.id));

    return rows.map((row) => toCategory(row, slugs.get(row.id) ?? null));
  }

  async createCategory(input: CategoryInput): Promise<Category> {
    const result = await this.from("categories")
      .insert({
        created_by: input.createdBy ?? null,
        description: input.description ?? null,
        name: input.name,
        parent_id: input.parentId ?? null,
        sort_order: input.sortOrder ?? 0,
        status: input.status ?? "draft",
        updated_by: input.createdBy ?? null,
      })
      .select(CATEGORY_SELECT)
      .maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Unable to create category.", {
        code: "category_create_failed",
        details: { cause: result.error?.message },
        statusCode: 500,
      });
    }

    const row = result.data as CategoryRow;
    const slug = await this.createSlug(row.id, input.slug ?? row.name, input.createdBy ?? null);

    return toCategory(row, slug);
  }

  async updateCategory(categoryId: string, input: CategoryUpdateInput): Promise<Category> {
    await this.loadCategoryById(categoryId);

    if (input.parentId === categoryId) {
      throw new HttpError("Category cannot be its own parent.", {
        code: "category_parent_invalid",
        statusCode: 422,
      });
    }

    const patch = {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.parentId !== undefined ? { parent_id: input.parentId } : {}),
      ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.updatedBy !== undefined ? { updated_by: input.updatedBy } : {}),
    };

    if (Object.keys(patch).length > 0) {
      const result = await this.from("categories").update(patch).eq("id", categoryId);

      if (result.error) {
        throw new HttpError("Unable to update category.", {
          code: "category_update_failed",
          details: { cause: result.error.message },
          statusCode: 500,
        });
      }
    }

    if (input.slug !== undefined) {
      await this.replaceSlug(categoryId, input.slug, input.updatedBy ?? null);
    }

    const row = await this.loadCategoryById(categoryId);
    const slug = await this.loadSlug(categoryId);

    return toCategory(row, slug);
  }

  async deleteCategory(categoryId: string): Promise<Category> {
    await this.loadCategoryById(categoryId);
    const result = await this.from("categories")
      .update({ deleted_at: new Date().toISOString(), status: "deleted" })
      .eq("id", categoryId);

    if (result.error) {
      throw new HttpError("Unable to delete category.", {
        code: "category_delete_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    await this.deactivateSlug(categoryId, null);
    return toCategory(await this.loadCategoryById(categoryId, { includeDeleted: true }), null);
  }

  async reorderCategories(
    items: CategoryReorderItem[],
    updatedBy: string | null,
  ): Promise<Category[]> {
    await Promise.all(
      items.map(async (item) => {
        const result = await this.from("categories")
          .update({
            parent_id: item.parentId ?? null,
            sort_order: item.sortOrder,
            updated_by: updatedBy,
          })
          .eq("id", item.id);

        if (result.error) {
          throw new HttpError("Unable to reorder categories.", {
            code: "categories_reorder_failed",
            details: { cause: result.error.message },
            statusCode: 500,
          });
        }
      }),
    );

    return this.listCategories();
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }

  private async loadCategoryById(
    categoryId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<CategoryRow> {
    let query = this.from("categories").select(CATEGORY_SELECT).eq("id", categoryId);

    if (!options.includeDeleted) {
      query = query.neq("status", "deleted");
    }

    const result = await query.maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Category was not found.", {
        code: "category_not_found",
        details: { cause: result.error?.message },
        statusCode: result.error ? 500 : 404,
      });
    }

    return result.data as CategoryRow;
  }

  private async loadSlug(categoryId: string): Promise<string | null> {
    const result = await this.from("slugs")
      .select("key,reference_id")
      .eq("reference_type", "category")
      .eq("reference_id", categoryId)
      .eq("is_active", true)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load category slug.", {
        code: "category_slug_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return result.data ? (result.data as SlugRow).key : null;
  }

  private async loadSlugs(categoryIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    await Promise.all(
      categoryIds.map(async (categoryId) => {
        const slug = await this.loadSlug(categoryId);

        if (slug) {
          map.set(categoryId, slug);
        }
      }),
    );

    return map;
  }

  private async createSlug(
    categoryId: string,
    source: string,
    userId: string | null,
  ): Promise<string> {
    const slug = (
      await this.slugs.suggestUniqueSlug({
        referenceType: "category",
        source,
      })
    ).slug;
    const result = await this.from("slugs").insert({
      created_by: userId,
      is_active: true,
      key: slug,
      locale: "vi",
      prefix: "",
      reference_id: categoryId,
      reference_type: "category",
      updated_by: userId,
    });

    if (result.error) {
      throw new HttpError("Unable to create category slug.", {
        code: "category_slug_create_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return slug;
  }

  private async replaceSlug(categoryId: string, source: string, userId: string | null) {
    await this.deactivateSlug(categoryId, userId);
    await this.createSlug(categoryId, source, userId);
  }

  private async deactivateSlug(categoryId: string, userId: string | null) {
    const result = await this.from("slugs")
      .update({ is_active: false, updated_by: userId })
      .eq("reference_type", "category")
      .eq("reference_id", categoryId)
      .eq("is_active", true);

    if (result.error) {
      throw new HttpError("Unable to deactivate category slug.", {
        code: "category_slug_deactivate_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
  }
}

export const categoryService = new CategoryService();

function toCategory(row: CategoryRow, slug: string | null): Category {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    description: row.description,
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    slug,
    sortOrder: row.sort_order,
    status: row.status,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}
