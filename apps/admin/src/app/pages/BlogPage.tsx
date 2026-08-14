import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { ErrorState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../components/toast-context";
import {
  createCategory,
  createTag,
  deleteCategory,
  deletePost,
  deleteTag,
  listCategories,
  listPosts,
  listTags,
  reorderCategories,
  updateCategory,
  updatePostStatus,
  updateTag,
  type AdminCategory,
  type AdminPostStatus,
  type AdminPostSummary,
  type AdminTag,
  type CategoryFormInput,
  type TagFormInput,
} from "../lib/api";

const statusOptions = ["draft", "published", "scheduled", "archived"] as const;

type CategoryFormState = CategoryFormInput & { id?: string };
type TagFormState = TagFormInput & { id?: string };

const emptyCategoryForm: CategoryFormState = {
  description: "",
  name: "",
  parentId: null,
  slug: "",
  sortOrder: 0,
  status: "draft",
};

const emptyTagForm: TagFormState = {
  description: "",
  name: "",
  slug: "",
  status: "published",
};

export function BlogPage() {
  const auth = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const token = auth.token ?? "";
  const [filters, setFilters] = useState({
    categoryId: "",
    page: 1,
    perPage: 10,
    search: "",
    status: "",
    tagId: "",
  });
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [tagForm, setTagForm] = useState<TagFormState>(emptyTagForm);
  const [pendingPostDeleteId, setPendingPostDeleteId] = useState<string | null>(null);
  const [pendingCategoryDeleteId, setPendingCategoryDeleteId] = useState<string | null>(null);
  const [pendingTagDeleteId, setPendingTagDeleteId] = useState<string | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);

  const postsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () =>
      listPosts(token, {
        categoryId: filters.categoryId || undefined,
        page: filters.page,
        perPage: filters.perPage,
        search: filters.search || undefined,
        status: filters.status || undefined,
        tagId: filters.tagId || undefined,
      }),
    queryKey: ["posts", filters],
  });
  const categoriesQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listCategories(token),
    queryKey: ["categories"],
  });
  const tagsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listTags(token),
    queryKey: ["tags"],
  });
  const statusMutation = useMutation({
    mutationFn: ({ postId, status }: { postId: string; status: AdminPostStatus }) =>
      updatePostStatus(token, postId, { status }),
    onSuccess: async () => {
      await invalidateBlogQueries(queryClient);
      notify({
        message: "Blog post status has been updated.",
        title: "Status updated",
        variant: "success",
      });
    },
  });
  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => deletePost(token, postId),
    onSuccess: async () => {
      setPendingPostDeleteId(null);
      await invalidateBlogQueries(queryClient);
      notify({
        message: "Blog post has been moved to deleted.",
        title: "Post deleted",
        variant: "success",
      });
    },
  });
  const saveCategoryMutation = useMutation({
    mutationFn: async (input: CategoryFormState) => {
      if (input.id) {
        return updateCategory(token, input.id, input);
      }

      return createCategory(token, input);
    },
    onSuccess: async () => {
      setCategoryForm(emptyCategoryForm);
      await invalidateTaxonomyQueries(queryClient);
      notify({ message: "Category has been saved.", title: "Category saved", variant: "success" });
    },
  });
  const reorderCategoryMutation = useMutation({
    mutationFn: (items: Array<{ id: string; parentId?: string | null; sortOrder: number }>) =>
      reorderCategories(token, items),
    onSuccess: async () => {
      await invalidateTaxonomyQueries(queryClient);
      notify({
        message: "Category tree order has been saved.",
        title: "Categories reordered",
        variant: "success",
      });
    },
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => deleteCategory(token, categoryId),
    onSuccess: async () => {
      setPendingCategoryDeleteId(null);
      await invalidateTaxonomyQueries(queryClient);
      notify({
        message: "Category has been deleted.",
        title: "Category deleted",
        variant: "success",
      });
    },
  });
  const saveTagMutation = useMutation({
    mutationFn: async (input: TagFormState) => {
      if (input.id) {
        return updateTag(token, input.id, input);
      }

      return createTag(token, input);
    },
    onSuccess: async () => {
      setTagForm(emptyTagForm);
      await invalidateTaxonomyQueries(queryClient);
      notify({ message: "Tag has been saved.", title: "Tag saved", variant: "success" });
    },
  });
  const deleteTagMutation = useMutation({
    mutationFn: (tagId: string) => deleteTag(token, tagId),
    onSuccess: async () => {
      setPendingTagDeleteId(null);
      await invalidateTaxonomyQueries(queryClient);
      notify({ message: "Tag has been deleted.", title: "Tag deleted", variant: "success" });
    },
  });

  const posts = postsQuery.data?.data ?? [];
  const pagination = postsQuery.data?.pagination;
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const error =
    postsQuery.error ??
    categoriesQuery.error ??
    tagsQuery.error ??
    statusMutation.error ??
    deletePostMutation.error ??
    saveCategoryMutation.error ??
    reorderCategoryMutation.error ??
    deleteCategoryMutation.error ??
    saveTagMutation.error ??
    deleteTagMutation.error;

  const columns: DataTableColumn<AdminPostSummary>[] = [
    {
      header: "Post",
      id: "post",
      render: (post) => (
        <>
          <strong>{post.title}</strong>
          <span>/{post.slug?.key ?? "no-slug"}</span>
        </>
      ),
      sortable: true,
      sortValue: (post) => post.title,
    },
    {
      header: "Taxonomy",
      id: "taxonomy",
      render: (post) => (
        <div className="taxonomy-cell">
          <span>
            {post.categories.map((category) => category.name).join(", ") || "No category"}
          </span>
          <span>{post.tags.map((tag) => `#${tag.slug}`).join(" ") || "No tags"}</span>
        </div>
      ),
    },
    {
      header: "Status",
      id: "status",
      render: (post) => (
        <span className={`status-pill status-pill--${post.status}`}>{post.status}</span>
      ),
      sortable: true,
      sortValue: (post) => post.status,
    },
    {
      header: "Views",
      id: "views",
      render: (post) => post.viewsCount.toLocaleString("vi-VN"),
      sortable: true,
      sortValue: (post) => post.viewsCount,
    },
    {
      header: "Updated",
      id: "updatedAt",
      render: (post) => formatDate(post.updatedAt),
      sortable: true,
      sortValue: (post) => post.updatedAt,
    },
    {
      align: "right",
      header: "Actions",
      id: "actions",
      render: (post) => (
        <div className="row-actions">
          <PermissionGate permission={Permission.BLOG_POSTS_EDIT}>
            <Link
              className="row-action-link"
              aria-label={`Edit ${post.title}`}
              to={`/admin/blog/posts/${post.id}/edit`}
            >
              <CmsIcon name="edit" />
            </Link>
          </PermissionGate>
          <PermissionGate permission={Permission.BLOG_POSTS_PUBLISH}>
            <button
              aria-label={`Publish ${post.title}`}
              disabled={post.status === "published" || statusMutation.isPending}
              type="button"
              onClick={() => statusMutation.mutate({ postId: post.id, status: "published" })}
            >
              <CmsIcon name="fileText" />
            </button>
          </PermissionGate>
          <PermissionGate permission={Permission.BLOG_POSTS_EDIT}>
            <button
              aria-label={`Archive ${post.title}`}
              disabled={post.status === "archived" || statusMutation.isPending}
              type="button"
              onClick={() => statusMutation.mutate({ postId: post.id, status: "archived" })}
            >
              <CmsIcon name="settings" />
            </button>
          </PermissionGate>
          <PermissionGate permission={Permission.BLOG_POSTS_DELETE}>
            <button
              aria-label={`Delete ${post.title}`}
              type="button"
              onClick={() => setPendingPostDeleteId(post.id)}
            >
              <CmsIcon name="trash" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  function handlePostSearch(formData: FormData) {
    setFilters((current) => ({
      ...current,
      categoryId: String(formData.get("categoryId") ?? ""),
      page: 1,
      search: String(formData.get("search") ?? ""),
      status: String(formData.get("status") ?? ""),
      tagId: String(formData.get("tagId") ?? ""),
    }));
  }

  function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveCategoryMutation.mutate(categoryForm);
  }

  function handleTagSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveTagMutation.mutate(tagForm);
  }

  function handleCategoryDrop(targetCategoryId: string) {
    if (!draggedCategoryId || draggedCategoryId === targetCategoryId) {
      setDraggedCategoryId(null);
      return;
    }

    const reordered = moveCategory(categories, draggedCategoryId, targetCategoryId);
    setDraggedCategoryId(null);
    reorderCategoryMutation.mutate(
      reordered.map((category, index) => ({
        id: category.id,
        parentId: category.parentId,
        sortOrder: index,
      })),
    );
  }

  return (
    <section className="pages-page blog-page">
      <PageHeader
        eyebrow="Content"
        title="Blog"
        actions={
          <PermissionGate permission={Permission.BLOG_POSTS_CREATE}>
            <Link className="cms-button" to="/admin/blog/posts/new">
              <CmsIcon name="plus" />
              New post
            </Link>
          </PermissionGate>
        }
      />

      {error && <ErrorState error={error} fallback="Unable to load blog workspace." />}

      <Card className="table-panel">
        <DataTable
          columns={columns}
          data={posts}
          emptyDescription="Create the first blog post."
          emptyTitle="No posts found"
          filters={
            <>
              <select name="status" defaultValue={filters.status}>
                <option value="">All status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select name="categoryId" defaultValue={filters.categoryId}>
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select name="tagId" defaultValue={filters.tagId}>
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </>
          }
          getRowKey={(post) => post.id}
          isLoading={postsQuery.isLoading}
          loadingDescription="Fetching blog posts."
          loadingTitle="Loading posts"
          onSearch={handlePostSearch}
          pagination={
            pagination
              ? {
                  label: `${pagination.total} posts`,
                  onPageChange: (page) => setFilters((current) => ({ ...current, page })),
                  page: pagination.page,
                  pageCount: pagination.pageCount,
                }
              : undefined
          }
          searchDefaultValue={filters.search}
          searchPlaceholder="Search posts"
        />
      </Card>

      <div className="taxonomy-management-grid">
        <PermissionGate permission={Permission.CATEGORIES_INDEX}>
          <Card className="taxonomy-manager">
            <CategoryManager
              categories={categories}
              draggedCategoryId={draggedCategoryId}
              form={categoryForm}
              isSaving={saveCategoryMutation.isPending || reorderCategoryMutation.isPending}
              onChange={setCategoryForm}
              onDelete={setPendingCategoryDeleteId}
              onDragStart={setDraggedCategoryId}
              onDrop={handleCategoryDrop}
              onSubmit={handleCategorySubmit}
            />
          </Card>
        </PermissionGate>

        <PermissionGate permission={Permission.TAGS_INDEX}>
          <Card className="taxonomy-manager">
            <TagManager
              form={tagForm}
              isSaving={saveTagMutation.isPending}
              onChange={setTagForm}
              onDelete={setPendingTagDeleteId}
              onSubmit={handleTagSubmit}
              tags={tags}
            />
          </Card>
        </PermissionGate>
      </div>

      <ConfirmDialog
        confirmLabel="Delete"
        description="Move this post to deleted status and deactivate its slug?"
        isOpen={Boolean(pendingPostDeleteId)}
        isPending={deletePostMutation.isPending}
        title="Delete post"
        onClose={() => setPendingPostDeleteId(null)}
        onConfirm={() => {
          if (pendingPostDeleteId) {
            deletePostMutation.mutate(pendingPostDeleteId);
          }
        }}
      />
      <ConfirmDialog
        confirmLabel="Delete"
        description="Move this category to deleted status?"
        isOpen={Boolean(pendingCategoryDeleteId)}
        isPending={deleteCategoryMutation.isPending}
        title="Delete category"
        onClose={() => setPendingCategoryDeleteId(null)}
        onConfirm={() => {
          if (pendingCategoryDeleteId) {
            deleteCategoryMutation.mutate(pendingCategoryDeleteId);
          }
        }}
      />
      <ConfirmDialog
        confirmLabel="Delete"
        description="Move this tag to deleted status?"
        isOpen={Boolean(pendingTagDeleteId)}
        isPending={deleteTagMutation.isPending}
        title="Delete tag"
        onClose={() => setPendingTagDeleteId(null)}
        onConfirm={() => {
          if (pendingTagDeleteId) {
            deleteTagMutation.mutate(pendingTagDeleteId);
          }
        }}
      />
    </section>
  );
}

function CategoryManager({
  categories,
  draggedCategoryId,
  form,
  isSaving,
  onChange,
  onDelete,
  onDragStart,
  onDrop,
  onSubmit,
}: {
  categories: AdminCategory[];
  draggedCategoryId: string | null;
  form: CategoryFormState;
  isSaving: boolean;
  onChange: (form: CategoryFormState) => void;
  onDelete: (categoryId: string) => void;
  onDragStart: (categoryId: string | null) => void;
  onDrop: (categoryId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section>
      <header className="taxonomy-manager-header">
        <div>
          <p>Taxonomy</p>
          <h3>Categories</h3>
        </div>
        <Button type="button" variant="secondary" onClick={() => onChange(emptyCategoryForm)}>
          <CmsIcon name="plus" />
          New
        </Button>
      </header>

      <form className="taxonomy-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Name
            <Input
              required
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            Slug
            <Input
              value={form.slug ?? ""}
              onChange={(event) => onChange({ ...form, slug: normalizeSlug(event.target.value) })}
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Parent
            <select
              value={form.parentId ?? ""}
              onChange={(event) => onChange({ ...form, parentId: event.target.value || null })}
            >
              <option value="">Root</option>
              {categories
                .filter((category) => category.id !== form.id)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) =>
                onChange({ ...form, status: event.target.value as AdminPostStatus })
              }
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Description
          <textarea
            value={form.description ?? ""}
            onChange={(event) => onChange({ ...form, description: event.target.value })}
          />
        </label>
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving" : form.id ? "Save category" : "Create category"}
        </Button>
      </form>

      <div className="taxonomy-list">
        {sortCategories(categories).map((category) => (
          <article
            draggable
            className={draggedCategoryId === category.id ? "is-dragging" : undefined}
            key={category.id}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => onDragStart(category.id)}
            onDrop={() => onDrop(category.id)}
          >
            <div>
              <strong>{category.name}</strong>
              <span>
                {category.slug ?? "no-slug"} · {category.status}
              </span>
            </div>
            <div className="row-actions">
              <button type="button" onClick={() => onChange(toCategoryFormState(category))}>
                <CmsIcon name="edit" />
              </button>
              <button type="button" onClick={() => onDelete(category.id)}>
                <CmsIcon name="trash" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TagManager({
  form,
  isSaving,
  onChange,
  onDelete,
  onSubmit,
  tags,
}: {
  form: TagFormState;
  isSaving: boolean;
  onChange: (form: TagFormState) => void;
  onDelete: (tagId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  tags: AdminTag[];
}) {
  return (
    <section>
      <header className="taxonomy-manager-header">
        <div>
          <p>Taxonomy</p>
          <h3>Tags</h3>
        </div>
        <Button type="button" variant="secondary" onClick={() => onChange(emptyTagForm)}>
          <CmsIcon name="plus" />
          New
        </Button>
      </header>

      <form className="taxonomy-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Name
            <Input
              required
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            Slug
            <Input
              value={form.slug ?? ""}
              onChange={(event) => onChange({ ...form, slug: normalizeSlug(event.target.value) })}
            />
          </label>
        </div>
        <label>
          Status
          <select
            value={form.status}
            onChange={(event) =>
              onChange({ ...form, status: event.target.value as AdminPostStatus })
            }
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Description
          <textarea
            value={form.description ?? ""}
            onChange={(event) => onChange({ ...form, description: event.target.value })}
          />
        </label>
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving" : form.id ? "Save tag" : "Create tag"}
        </Button>
      </form>

      <div className="taxonomy-list">
        {tags.map((tag) => (
          <article key={tag.id}>
            <div>
              <strong>{tag.name}</strong>
              <span>
                #{tag.slug} · {tag.status}
              </span>
            </div>
            <div className="row-actions">
              <button type="button" onClick={() => onChange(toTagFormState(tag))}>
                <CmsIcon name="edit" />
              </button>
              <button type="button" onClick={() => onDelete(tag.id)}>
                <CmsIcon name="trash" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

async function invalidateBlogQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["posts"] }),
    queryClient.invalidateQueries({ queryKey: ["categories"] }),
    queryClient.invalidateQueries({ queryKey: ["tags"] }),
  ]);
}

async function invalidateTaxonomyQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["posts"] }),
    queryClient.invalidateQueries({ queryKey: ["categories"] }),
    queryClient.invalidateQueries({ queryKey: ["tags"] }),
  ]);
}

function toCategoryFormState(category: AdminCategory): CategoryFormState {
  return {
    description: category.description ?? "",
    id: category.id,
    name: category.name,
    parentId: category.parentId,
    slug: category.slug ?? "",
    sortOrder: category.sortOrder,
    status: category.status as AdminPostStatus,
  };
}

function toTagFormState(tag: AdminTag): TagFormState {
  return {
    description: tag.description ?? "",
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    status: tag.status as AdminPostStatus,
  };
}

function moveCategory(categories: AdminCategory[], draggedId: string, targetId: string) {
  const sorted = sortCategories(categories);
  const from = sorted.findIndex((category) => category.id === draggedId);
  const to = sorted.findIndex((category) => category.id === targetId);

  if (from < 0 || to < 0) {
    return sorted;
  }

  const next = [...sorted];
  const [dragged] = next.splice(from, 1);
  if (!dragged) {
    return sorted;
  }
  next.splice(to, 0, dragged);

  return next;
}

function sortCategories(categories: AdminCategory[]) {
  return [...categories].sort((left, right) => {
    if (left.parentId !== right.parentId) {
      return (left.parentId ?? "").localeCompare(right.parentId ?? "");
    }

    return left.sortOrder - right.sortOrder || left.name.localeCompare(right.name);
  });
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}
