import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type {
  LinkableResource,
  MenuDetail,
  MenuInput,
  MenuNode,
  MenuNodeInput,
  MenuResourceType,
  MenuSummary,
  MenuUpdateInput,
} from "./menu.types.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  delete: () => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  insert: (values: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  neq: (column: string, value: unknown) => QueryBuilder;
  or: (filters: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
};

type MenuServiceClient = Pick<SupabaseClient, "from">;

type MenuRow = {
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
  description: string | null;
  id: string;
  location: string;
  name: string;
  slug: string;
  status: string;
  updated_at: string;
  updated_by: string | null;
};

type MenuNodeRow = {
  created_at: string;
  created_by: string | null;
  css_class: string | null;
  deleted_at: string | null;
  icon: string | null;
  id: string;
  link_type: string;
  menu_id: string;
  parent_id: string | null;
  rel: string | null;
  resource_id: string | null;
  resource_type: MenuResourceType | null;
  sort_order: number;
  status: string;
  target: string;
  title: string;
  updated_at: string;
  updated_by: string | null;
  url: string | null;
};

type ResourceRow = {
  id: string;
  status: string;
  title?: string;
  name?: string;
  updated_at: string;
};

const MENU_SELECT =
  "id,name,slug,location,description,status,created_by,updated_by,deleted_at,created_at,updated_at";
const MENU_NODE_SELECT =
  "id,menu_id,parent_id,title,link_type,url,resource_type,resource_id,target,rel,icon,css_class,sort_order,status,created_by,updated_by,deleted_at,created_at,updated_at";

export class MenuService {
  private readonly client: MenuServiceClient;

  constructor(options: { client?: MenuServiceClient } = {}) {
    this.client = options.client ?? supabase;
  }

  async listMenus(): Promise<MenuSummary[]> {
    const result = (await this.from("menus")
      .select(MENU_SELECT)
      .neq("status", "deleted")
      .order("location", { ascending: true })) as SupabaseQueryResult<MenuRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list menus.", {
        code: "menus_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).map(toMenuSummary);
  }

  async getMenu(menuId: string): Promise<MenuDetail> {
    const menu = await this.loadMenuById(menuId);
    const nodes = await this.loadMenuNodes(menu.id);

    return { ...toMenuSummary(menu), nodes };
  }

  async createMenu(input: MenuInput): Promise<MenuDetail> {
    const result = await this.from("menus")
      .insert({
        created_by: input.createdBy ?? null,
        description: input.description ?? null,
        location: input.location,
        name: input.name,
        slug: input.slug,
        status: input.status ?? "active",
        updated_by: input.createdBy ?? null,
      })
      .select(MENU_SELECT)
      .maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Unable to create menu.", {
        code: "menu_create_failed",
        details: { cause: result.error?.message },
        statusCode: 500,
      });
    }

    return { ...toMenuSummary(result.data as MenuRow), nodes: [] };
  }

  async updateMenu(menuId: string, input: MenuUpdateInput): Promise<MenuDetail> {
    await this.loadMenuById(menuId);
    const patch = {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.updatedBy !== undefined ? { updated_by: input.updatedBy } : {}),
    };

    if (Object.keys(patch).length > 0) {
      const result = await this.from("menus").update(patch).eq("id", menuId);

      if (result.error) {
        throw new HttpError("Unable to update menu.", {
          code: "menu_update_failed",
          details: { cause: result.error.message },
          statusCode: 500,
        });
      }
    }

    return this.getMenu(menuId);
  }

  async saveMenuTree(
    menuId: string,
    nodes: MenuNodeInput[],
    updatedBy: string | null,
  ): Promise<MenuDetail> {
    await this.loadMenuById(menuId);
    const flattened = flattenNodes(nodes);

    for (const node of flattened) {
      validateNode(node);
    }

    const deleteResult = await this.from("menu_nodes").delete().eq("menu_id", menuId);

    if (deleteResult.error) {
      throw new HttpError("Unable to clear menu tree.", {
        code: "menu_tree_clear_failed",
        details: { cause: deleteResult.error.message },
        statusCode: 500,
      });
    }

    if (flattened.length > 0) {
      const insertResult = await this.from("menu_nodes").insert(
        flattened.map((node) => ({
          css_class: node.cssClass ?? null,
          icon: node.icon ?? null,
          id: node.id,
          link_type: node.linkType,
          menu_id: menuId,
          parent_id: node.parentId ?? null,
          rel: node.rel ?? null,
          resource_id: node.resourceId ?? null,
          resource_type: node.resourceType ?? null,
          sort_order: node.sortOrder ?? 0,
          status: node.status ?? "active",
          target: node.target ?? "_self",
          title: node.title,
          updated_by: updatedBy,
          url: node.url ?? null,
        })),
      );

      if (insertResult.error) {
        throw new HttpError("Unable to save menu tree.", {
          code: "menu_tree_save_failed",
          details: { cause: insertResult.error.message },
          statusCode: 500,
        });
      }
    }

    return this.getMenu(menuId);
  }

  async deleteMenu(menuId: string, updatedBy: string | null): Promise<MenuDetail> {
    await this.loadMenuById(menuId);
    const result = await this.from("menus")
      .update({ deleted_at: new Date().toISOString(), status: "deleted", updated_by: updatedBy })
      .eq("id", menuId);

    if (result.error) {
      throw new HttpError("Unable to delete menu.", {
        code: "menu_delete_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const nodesResult = await this.from("menu_nodes")
      .update({ deleted_at: new Date().toISOString(), status: "deleted", updated_by: updatedBy })
      .eq("menu_id", menuId);

    if (nodesResult.error) {
      throw new HttpError("Unable to delete menu nodes.", {
        code: "menu_nodes_delete_failed",
        details: { cause: nodesResult.error.message },
        statusCode: 500,
      });
    }

    const menu = await this.loadMenuById(menuId, { includeDeleted: true });

    return { ...toMenuSummary(menu), nodes: [] };
  }

  async searchLinkableResources(search: string): Promise<LinkableResource[]> {
    const escaped = escapeSearch(search);
    const [pages, posts, categories] = await Promise.all([
      this.searchResourceTable("pages", "page", escaped),
      this.searchResourceTable("posts", "post", escaped),
      this.searchResourceTable("categories", "category", escaped),
    ]);

    return [...pages, ...posts, ...categories].sort((left, right) =>
      left.title.localeCompare(right.title),
    );
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }

  private async loadMenuById(
    menuId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<MenuRow> {
    let query = this.from("menus").select(MENU_SELECT).eq("id", menuId);

    if (!options.includeDeleted) {
      query = query.neq("status", "deleted");
    }

    const result = await query.maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Menu was not found.", {
        code: "menu_not_found",
        details: { cause: result.error?.message },
        statusCode: result.error ? 500 : 404,
      });
    }

    return result.data as MenuRow;
  }

  private async loadMenuNodes(menuId: string): Promise<MenuNode[]> {
    const result = (await this.from("menu_nodes")
      .select(MENU_NODE_SELECT)
      .eq("menu_id", menuId)
      .neq("status", "deleted")
      .order("sort_order", { ascending: true })) as SupabaseQueryResult<MenuNodeRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load menu nodes.", {
        code: "menu_nodes_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return buildTree((result.data ?? []).map(toMenuNode));
  }

  private async searchResourceTable(
    table: "categories" | "pages" | "posts",
    type: MenuResourceType,
    search: string,
  ): Promise<LinkableResource[]> {
    const titleColumn = table === "categories" ? "name" : "title";
    let query = this.from(table)
      .select(`id,${titleColumn},status,updated_at`)
      .neq("status", "deleted")
      .order("updated_at", { ascending: false })
      .range(0, 9);

    if (search) {
      query = query.or(`${titleColumn}.ilike.%${search}%`);
    }

    const result = (await query) as SupabaseQueryResult<ResourceRow[]>;

    if (result.error) {
      throw new HttpError("Unable to search linkable resources.", {
        code: "linkable_resources_search_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      title: row.title ?? row.name ?? "Untitled",
      type,
      updatedAt: row.updated_at,
    }));
  }
}

export const menuService = new MenuService();

function toMenuSummary(row: MenuRow): MenuSummary {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    description: row.description,
    id: row.id,
    location: row.location,
    name: row.name,
    slug: row.slug,
    status: row.status,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function toMenuNode(row: MenuNodeRow): MenuNode {
  return {
    children: [],
    createdAt: row.created_at,
    createdBy: row.created_by,
    cssClass: row.css_class,
    deletedAt: row.deleted_at,
    icon: row.icon,
    id: row.id,
    linkType: row.link_type,
    menuId: row.menu_id,
    parentId: row.parent_id,
    rel: row.rel,
    resourceId: row.resource_id,
    resourceType: row.resource_type,
    sortOrder: row.sort_order,
    status: row.status,
    target: row.target,
    title: row.title,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    url: row.url,
  };
}

function buildTree(nodes: MenuNode[]): MenuNode[] {
  const byId = new Map(nodes.map((node) => [node.id, { ...node, children: [] as MenuNode[] }]));
  const roots: MenuNode[] = [];

  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return sortTree(roots);
}

function sortTree(nodes: MenuNode[]): MenuNode[] {
  return nodes
    .sort(
      (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
    )
    .map((node) => ({ ...node, children: sortTree(node.children) }));
}

function flattenNodes(nodes: MenuNodeInput[], parentId: string | null = null): MenuNodeInput[] {
  return nodes.flatMap((node, index) => {
    const id = node.id ?? randomUUID();
    const current = {
      ...node,
      id,
      parentId,
      sortOrder: node.sortOrder ?? index,
    };

    return [current, ...flattenNodes(node.children ?? [], id)];
  });
}

function validateNode(node: MenuNodeInput): void {
  if (node.linkType === "custom" && !node.url) {
    throw new HttpError("Custom menu nodes require a URL.", {
      code: "menu_node_url_required",
      statusCode: 422,
    });
  }

  if (["page", "post", "category", "tag"].includes(node.linkType) && !node.resourceId) {
    throw new HttpError("Resource menu nodes require a resource.", {
      code: "menu_node_resource_required",
      statusCode: 422,
    });
  }
}

function escapeSearch(value: string): string {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}
