export type MenuStatus = "active" | "archived" | "deleted" | "inactive";
export type MenuNodeStatus = "active" | "archived" | "deleted" | "inactive";
export type MenuNodeLinkType = "category" | "custom" | "label" | "page" | "post" | "tag";
export type MenuResourceType = Exclude<MenuNodeLinkType, "custom" | "label">;

export type MenuSummary = {
  createdAt: string;
  createdBy: string | null;
  deletedAt: string | null;
  description: string | null;
  id: string;
  location: string;
  name: string;
  slug: string;
  status: MenuStatus | string;
  updatedAt: string;
  updatedBy: string | null;
};

export type MenuNode = {
  children: MenuNode[];
  createdAt: string;
  createdBy: string | null;
  cssClass: string | null;
  deletedAt: string | null;
  icon: string | null;
  id: string;
  linkType: MenuNodeLinkType | string;
  menuId: string;
  parentId: string | null;
  rel: string | null;
  resourceId: string | null;
  resourceType: MenuResourceType | null;
  sortOrder: number;
  status: MenuNodeStatus | string;
  target: "_blank" | "_self" | string;
  title: string;
  updatedAt: string;
  updatedBy: string | null;
  url: string | null;
};

export type MenuDetail = MenuSummary & {
  nodes: MenuNode[];
};

export type MenuInput = {
  createdBy?: string | null | undefined;
  description?: string | null | undefined;
  location: string;
  name: string;
  slug: string;
  status?: Exclude<MenuStatus, "deleted"> | undefined;
  updatedBy?: string | null | undefined;
};

export type MenuUpdateInput = Omit<Partial<MenuInput>, "location" | "name" | "slug"> & {
  location?: string | undefined;
  name?: string | undefined;
  slug?: string | undefined;
};

export type MenuNodeInput = {
  children?: MenuNodeInput[] | undefined;
  cssClass?: string | null | undefined;
  icon?: string | null | undefined;
  id?: string | undefined;
  linkType: MenuNodeLinkType;
  parentId?: string | null | undefined;
  rel?: string | null | undefined;
  resourceId?: string | null | undefined;
  resourceType?: MenuResourceType | null | undefined;
  sortOrder?: number | undefined;
  status?: Exclude<MenuNodeStatus, "deleted"> | undefined;
  target?: "_blank" | "_self" | undefined;
  title: string;
  url?: string | null | undefined;
};

export type LinkableResource = {
  id: string;
  status: string;
  title: string;
  type: MenuResourceType;
  updatedAt: string;
};
