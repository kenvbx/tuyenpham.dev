export type GalleryStatus = "archived" | "deleted" | "draft" | "published";

export type GalleryItem = {
  alt: string | null;
  caption: string | null;
  createdAt: string;
  id: string;
  linkUrl: string | null;
  mediaFileId: string | null;
  sortOrder: number;
  title: string | null;
  updatedAt: string;
};

export type Gallery = {
  createdAt: string;
  createdBy: string | null;
  deletedAt: string | null;
  description: string | null;
  id: string;
  items: GalleryItem[];
  name: string;
  slug: string;
  status: GalleryStatus | string;
  updatedAt: string;
  updatedBy: string | null;
};

export type GalleryInput = {
  createdBy?: string | null | undefined;
  description?: string | null | undefined;
  items?: GalleryItemInput[] | undefined;
  name: string;
  slug: string;
  status?: GalleryStatus | undefined;
  updatedBy?: string | null | undefined;
};

export type GalleryUpdateInput = {
  description?: string | null | undefined;
  items?: GalleryItemInput[] | undefined;
  name?: string | undefined;
  slug?: string | undefined;
  status?: GalleryStatus | undefined;
  updatedBy?: string | null | undefined;
};

export type GalleryItemInput = {
  alt?: string | null | undefined;
  caption?: string | null | undefined;
  id?: string | undefined;
  linkUrl?: string | null | undefined;
  mediaFileId?: string | null | undefined;
  sortOrder?: number | undefined;
  title?: string | null | undefined;
};
