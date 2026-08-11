import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { MediaPickerModal } from "../components/MediaPickerModal";
import { ErrorState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { ValidationSummary } from "../components/ValidationSummary";
import { useToast } from "../components/toast-context";
import {
  createCategory,
  createPost,
  createTag,
  deleteCategory,
  deletePost,
  deleteTag,
  getPost,
  listCategories,
  listPostRevisions,
  listPosts,
  listTags,
  reorderCategories,
  restorePostRevision,
  updateCategory,
  updatePost,
  updatePostStatus,
  updateTag,
  type AdminCategory,
  type AdminPostDetail,
  type AdminPostRevision,
  type AdminPostStatus,
  type AdminPostSummary,
  type AdminTag,
  type CategoryFormInput,
  type PostFormInput,
  type TagFormInput,
} from "../lib/api";

const statusOptions = ["draft", "published", "scheduled", "archived"] as const;

type PostFormState = PostFormInput & {
  categoryIds: string[];
  id?: string;
  relatedPostIds: string[];
  seo: NonNullable<PostFormInput["seo"]>;
  tagIds: string[];
};

type CategoryFormState = CategoryFormInput & { id?: string };
type TagFormState = TagFormInput & { id?: string };

const emptyPostForm: PostFormState = {
  categoryIds: [],
  contentHtml: "",
  contentText: "",
  excerpt: "",
  featuredImageId: "",
  publishedAt: "",
  relatedPostIds: [],
  seo: {
    canonicalUrl: "",
    metaDescription: "",
    metaTitle: "",
    nofollow: false,
    noindex: false,
    ogDescription: "",
    ogImageId: "",
    ogImageUrl: "",
    ogTitle: "",
  },
  slug: "",
  status: "draft",
  tagIds: [],
  title: "",
};

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
  const [postForm, setPostForm] = useState<PostFormState>(emptyPostForm);
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
  const postOptionsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listPosts(token, { page: 1, perPage: 100 }),
    queryKey: ["posts", "options"],
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
  const revisionsQuery = useQuery({
    enabled: Boolean(token && postForm.id),
    queryFn: () => listPostRevisions(token, postForm.id ?? ""),
    queryKey: ["posts", postForm.id, "revisions"],
  });

  const loadPostMutation = useMutation({
    mutationFn: (postId: string) => getPost(token, postId),
    onSuccess: (post) => setPostForm(toPostFormState(post)),
  });
  const savePostMutation = useMutation({
    mutationFn: async (input: PostFormState) => {
      if (input.id) {
        return updatePost(token, input.id, input);
      }

      return createPost(token, input);
    },
    onSuccess: async (post) => {
      setPostForm(toPostFormState(post));
      await invalidateBlogQueries(queryClient);
      notify({ message: "Blog post has been saved.", title: "Post saved", variant: "success" });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ postId, status }: { postId: string; status: AdminPostStatus }) =>
      updatePostStatus(token, postId, { status }),
    onSuccess: async (post) => {
      if (postForm.id === post.id) {
        setPostForm(toPostFormState(post));
      }
      await invalidateBlogQueries(queryClient);
      notify({
        message: "Blog post status has been updated.",
        title: "Status updated",
        variant: "success",
      });
    },
  });
  const restoreRevisionMutation = useMutation({
    mutationFn: ({ postId, revisionId }: { postId: string; revisionId: string }) =>
      restorePostRevision(token, postId, revisionId),
    onSuccess: async (post) => {
      setPostForm(toPostFormState(post));
      await invalidateBlogQueries(queryClient);
      notify({
        message: "Blog post has been restored from a revision.",
        title: "Revision restored",
        variant: "success",
      });
    },
  });
  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => deletePost(token, postId),
    onSuccess: async () => {
      setPendingPostDeleteId(null);
      if (pendingPostDeleteId === postForm.id) {
        setPostForm(emptyPostForm);
      }
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
  const postOptions = postOptionsQuery.data?.data ?? [];
  const pagination = postsQuery.data?.pagination;
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const error =
    postsQuery.error ??
    postOptionsQuery.error ??
    categoriesQuery.error ??
    tagsQuery.error ??
    loadPostMutation.error ??
    savePostMutation.error ??
    statusMutation.error ??
    revisionsQuery.error ??
    restoreRevisionMutation.error ??
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
            <button
              aria-label={`Edit ${post.title}`}
              type="button"
              onClick={() => loadPostMutation.mutate(post.id)}
            >
              <CmsIcon name="edit" />
            </button>
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

  function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    savePostMutation.mutate(postForm);
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
            <Button type="button" onClick={() => setPostForm(emptyPostForm)}>
              <CmsIcon name="plus" />
              New post
            </Button>
          </PermissionGate>
        }
      />

      {error && <ErrorState error={error} fallback="Unable to load blog workspace." />}

      <div className="pages-layout">
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

        <PermissionGate
          permission={postForm.id ? Permission.BLOG_POSTS_EDIT : Permission.BLOG_POSTS_CREATE}
        >
          <Card className="form-panel">
            <PostForm
              categories={categories}
              form={postForm}
              isLoading={loadPostMutation.isPending}
              isSaving={savePostMutation.isPending}
              onChange={setPostForm}
              onRestoreRevision={(revisionId) => {
                if (postForm.id) {
                  restoreRevisionMutation.mutate({ postId: postForm.id, revisionId });
                }
              }}
              onSubmit={handlePostSubmit}
              postOptions={postOptions}
              revisions={revisionsQuery.data ?? []}
              revisionsLoading={revisionsQuery.isFetching || restoreRevisionMutation.isPending}
              tags={tags}
              token={token}
              validationError={savePostMutation.error}
            />
          </Card>
        </PermissionGate>
      </div>

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

function PostForm({
  categories,
  form,
  isLoading,
  isSaving,
  onChange,
  onRestoreRevision,
  onSubmit,
  postOptions,
  revisions,
  revisionsLoading,
  tags,
  token,
  validationError,
}: {
  categories: AdminCategory[];
  form: PostFormState;
  isLoading: boolean;
  isSaving: boolean;
  onChange: (form: PostFormState) => void;
  onRestoreRevision: (revisionId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  postOptions: AdminPostSummary[];
  revisions: AdminPostRevision[];
  revisionsLoading: boolean;
  tags: AdminTag[];
  token: string;
  validationError: unknown;
}) {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const relatedOptions = postOptions.filter((post) => post.id !== form.id);

  return (
    <form className="page-form post-form" onSubmit={onSubmit}>
      <div>
        <p>{form.id ? "Edit post" : "Create post"}</p>
        <h3>{form.id ? form.title : "New blog post"}</h3>
      </div>

      {Boolean(validationError) && (
        <ValidationSummary error={validationError} fallback="Unable to save post." />
      )}

      <label>
        Title
        <Input
          required
          disabled={isLoading}
          value={form.title}
          onChange={(event) => onChange({ ...form, title: event.target.value })}
        />
      </label>

      <label>
        Slug
        <Input
          disabled={isLoading}
          placeholder="auto-generated-from-title"
          value={form.slug}
          onChange={(event) => onChange({ ...form, slug: normalizeSlug(event.target.value) })}
        />
      </label>

      <div className="form-grid">
        <label>
          Status
          <select
            disabled={isLoading}
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
          Publish date
          <Input
            disabled={isLoading}
            type="datetime-local"
            value={toDatetimeLocalValue(form.publishedAt)}
            onChange={(event) =>
              onChange({ ...form, publishedAt: fromDatetimeLocalValue(event.target.value) })
            }
          />
        </label>
      </div>

      <label>
        Excerpt
        <textarea
          disabled={isLoading}
          maxLength={1000}
          value={form.excerpt ?? ""}
          onChange={(event) => onChange({ ...form, excerpt: event.target.value })}
        />
      </label>

      <TaxonomyChoices
        emptyLabel="No categories available."
        ids={form.categoryIds}
        items={categories}
        label="Categories"
        onToggle={(categoryId) =>
          onChange({ ...form, categoryIds: toggleId(form.categoryIds, categoryId) })
        }
      />

      <TaxonomyChoices
        emptyLabel="No tags available."
        ids={form.tagIds}
        items={tags}
        label="Tags"
        onToggle={(tagId) => onChange({ ...form, tagIds: toggleId(form.tagIds, tagId) })}
      />

      <TaxonomyChoices
        emptyLabel="No related post options."
        getLabel={(post) => post.title}
        ids={form.relatedPostIds}
        items={relatedOptions}
        label="Related posts"
        onToggle={(postId) =>
          onChange({ ...form, relatedPostIds: toggleId(form.relatedPostIds, postId) })
        }
      />

      <label>
        Content
        <RichTextEditor
          value={form.contentHtml ?? ""}
          onChange={(contentHtml) =>
            onChange({
              ...form,
              contentHtml,
              contentText: stripHtml(contentHtml),
            })
          }
        />
      </label>

      <div className="media-reference-field">
        <label>
          Featured image ID
          <Input
            disabled={isLoading}
            value={form.featuredImageId ?? ""}
            onChange={(event) => onChange({ ...form, featuredImageId: event.target.value })}
          />
        </label>
        <Button type="button" variant="secondary" onClick={() => setIsMediaPickerOpen(true)}>
          <CmsIcon name="media" />
          Pick image
        </Button>
      </div>

      <SeoFields form={form} onChange={onChange} />

      <Button disabled={isSaving || isLoading} type="submit">
        {isSaving ? "Saving" : form.id ? "Save changes" : "Create post"}
      </Button>

      {form.id && (
        <RevisionPanel
          isLoading={revisionsLoading}
          revisions={revisions}
          onRestore={onRestoreRevision}
        />
      )}

      <MediaPickerModal
        acceptedType="image"
        isOpen={isMediaPickerOpen}
        token={token}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(file) =>
          onChange({
            ...form,
            featuredImageId: file.id,
            seo: {
              ...form.seo,
              ogImageId: form.seo.ogImageId || file.id,
              ogImageUrl: form.seo.ogImageUrl || file.url,
            },
          })
        }
      />
    </form>
  );
}

function TaxonomyChoices<TItem extends { id: string; name?: string; title?: string }>({
  emptyLabel,
  getLabel = (item) => item.name ?? item.title ?? item.id,
  ids,
  items,
  label,
  onToggle,
}: {
  emptyLabel: string;
  getLabel?: (item: TItem) => string;
  ids: string[];
  items: TItem[];
  label: string;
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="taxonomy-fieldset">
      <legend>{label}</legend>
      <div className="choice-list">
        {items.map((item) => (
          <label key={item.id}>
            <input
              checked={ids.includes(item.id)}
              type="checkbox"
              onChange={() => onToggle(item.id)}
            />
            <span>{getLabel(item)}</span>
          </label>
        ))}
        {items.length === 0 && <small>{emptyLabel}</small>}
      </div>
    </fieldset>
  );
}

function SeoFields({
  form,
  onChange,
}: {
  form: PostFormState;
  onChange: (form: PostFormState) => void;
}) {
  return (
    <fieldset className="seo-fieldset">
      <legend>SEO</legend>
      <label>
        Meta title
        <Input
          maxLength={160}
          value={form.seo.metaTitle ?? ""}
          onChange={(event) =>
            onChange({ ...form, seo: { ...form.seo, metaTitle: event.target.value } })
          }
        />
      </label>
      <label>
        Meta description
        <textarea
          maxLength={320}
          value={form.seo.metaDescription ?? ""}
          onChange={(event) =>
            onChange({ ...form, seo: { ...form.seo, metaDescription: event.target.value } })
          }
        />
      </label>
      <label>
        Canonical URL
        <Input
          type="url"
          value={form.seo.canonicalUrl ?? ""}
          onChange={(event) =>
            onChange({ ...form, seo: { ...form.seo, canonicalUrl: event.target.value } })
          }
        />
      </label>
      <label>
        OG title
        <Input
          maxLength={160}
          value={form.seo.ogTitle ?? ""}
          onChange={(event) =>
            onChange({ ...form, seo: { ...form.seo, ogTitle: event.target.value } })
          }
        />
      </label>
      <label>
        OG description
        <textarea
          maxLength={320}
          value={form.seo.ogDescription ?? ""}
          onChange={(event) =>
            onChange({ ...form, seo: { ...form.seo, ogDescription: event.target.value } })
          }
        />
      </label>
      <div className="form-grid">
        <label>
          OG image ID
          <Input
            value={form.seo.ogImageId ?? ""}
            onChange={(event) =>
              onChange({ ...form, seo: { ...form.seo, ogImageId: event.target.value } })
            }
          />
        </label>
        <label>
          OG image URL
          <Input
            type="url"
            value={form.seo.ogImageUrl ?? ""}
            onChange={(event) =>
              onChange({ ...form, seo: { ...form.seo, ogImageUrl: event.target.value } })
            }
          />
        </label>
      </div>
      <div className="inline-checks">
        <label>
          <input
            checked={Boolean(form.seo.noindex)}
            type="checkbox"
            onChange={(event) =>
              onChange({ ...form, seo: { ...form.seo, noindex: event.target.checked } })
            }
          />
          Noindex
        </label>
        <label>
          <input
            checked={Boolean(form.seo.nofollow)}
            type="checkbox"
            onChange={(event) =>
              onChange({ ...form, seo: { ...form.seo, nofollow: event.target.checked } })
            }
          />
          Nofollow
        </label>
      </div>
    </fieldset>
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

function RevisionPanel({
  isLoading,
  onRestore,
  revisions,
}: {
  isLoading: boolean;
  onRestore: (revisionId: string) => void;
  revisions: AdminPostRevision[];
}) {
  return (
    <section className="revision-panel">
      <header>
        <div>
          <p>History</p>
          <h4>Revisions</h4>
        </div>
        {isLoading && <span>Loading</span>}
      </header>
      {revisions.length === 0 ? (
        <p>No revisions yet.</p>
      ) : (
        <div className="revision-list">
          {revisions.map((revision) => (
            <article key={revision.id}>
              <div>
                <strong>Revision {revision.revisionNumber}</strong>
                <span>{revision.title ?? revision.snapshot.title}</span>
                <small>{formatDate(revision.createdAt)}</small>
              </div>
              <Button
                disabled={isLoading}
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => onRestore(revision.id)}
              >
                Restore
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RichTextEditor({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <div className="rich-editor">
      <div className="editor-toolbar" aria-label="Editor toolbar">
        <button type="button" onClick={() => onChange(`${value}<h2>Heading</h2>`)}>
          H2
        </button>
        <button type="button" onClick={() => onChange(`${value}<p>Paragraph text</p>`)}>
          P
        </button>
        <button type="button" onClick={() => onChange(`${value}<strong>Bold text</strong>`)}>
          B
        </button>
        <button type="button" onClick={() => onChange(`${value}<ul><li>List item</li></ul>`)}>
          List
        </button>
      </div>
      <textarea
        className="content-textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="editor-preview" dangerouslySetInnerHTML={{ __html: value || "<p></p>" }} />
    </div>
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

function toPostFormState(post: AdminPostDetail): PostFormState {
  return {
    categoryIds: post.categories.map((category) => category.id),
    contentHtml: post.contentHtml ?? "",
    contentText: post.contentText ?? "",
    excerpt: post.excerpt ?? "",
    featuredImageId: post.featuredImageId ?? "",
    id: post.id,
    publishedAt: post.publishedAt ?? "",
    relatedPostIds: post.relatedPosts.map((relatedPost) => relatedPost.id),
    seo: {
      canonicalUrl: post.seo?.canonicalUrl ?? "",
      metaDescription: post.seo?.metaDescription ?? "",
      metaTitle: post.seo?.metaTitle ?? "",
      nofollow: post.seo?.nofollow ?? false,
      noindex: post.seo?.noindex ?? false,
      ogDescription: post.seo?.ogDescription ?? "",
      ogImageId: post.seo?.ogImageId ?? "",
      ogImageUrl: post.seo?.ogImageUrl ?? "",
      ogTitle: post.seo?.ogTitle ?? "",
    },
    slug: post.slug?.key ?? "",
    status: post.status as AdminPostStatus,
    tagIds: post.tags.map((tag) => tag.id),
    title: post.title,
  };
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

function toDatetimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

function fromDatetimeLocalValue(value: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString();
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((currentId) => currentId !== id) : [...ids, id];
}
