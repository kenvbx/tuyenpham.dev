export type CategoryStatus = "archived" | "deleted" | "draft" | "published" | "scheduled";

export type Category = {
  createdAt: string;
  createdBy: string | null;
  deletedAt: string | null;
  description: string | null;
  id: string;
  name: string;
  parentId: string | null;
  slug: string | null;
  sortOrder: number;
  status: CategoryStatus | string;
  updatedAt: string;
  updatedBy: string | null;
};

export type CategoryInput = {
  createdBy?: string | null | undefined;
  description?: string | null | undefined;
  name: string;
  parentId?: string | null | undefined;
  slug?: string | undefined;
  sortOrder?: number | undefined;
  status?: Exclude<CategoryStatus, "deleted"> | undefined;
  updatedBy?: string | null | undefined;
};

export type CategoryUpdateInput = Omit<Partial<CategoryInput>, "name"> & {
  name?: string | undefined;
};

export type CategoryReorderItem = {
  id: string;
  parentId?: string | null | undefined;
  sortOrder: number;
};
