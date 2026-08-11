export type TagStatus = "archived" | "deleted" | "draft" | "published" | "scheduled";

export type Tag = {
  createdAt: string;
  createdBy: string | null;
  deletedAt: string | null;
  description: string | null;
  id: string;
  name: string;
  slug: string;
  status: TagStatus | string;
  updatedAt: string;
  updatedBy: string | null;
};

export type TagInput = {
  createdBy?: string | null | undefined;
  description?: string | null | undefined;
  name: string;
  slug?: string | undefined;
  status?: Exclude<TagStatus, "deleted"> | undefined;
  updatedBy?: string | null | undefined;
};

export type TagUpdateInput = Omit<Partial<TagInput>, "name"> & {
  name?: string | undefined;
};

export type ListTagsParams = {
  search?: string | undefined;
  status?: TagStatus | undefined;
};
