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
  createPost,
  deletePost,
  getPost,
  listCategories,
  listPosts,
  listTags,
  updatePost,
  type AdminCategory,
  type AdminPostDetail,
  type AdminPostStatus,
  type AdminPostSummary,
  type AdminTag,
  type PostFormInput,
} from "../lib/api";

const statusOptions = ["draft", "published", "scheduled", "archived"] as const;

type PostFormState = PostFormInput & {
  categoryIds: string[];
  id?: string;
  seo: NonNullable<PostFormInput["seo"]>;
  tagIds: string[];
};

const emptyForm: PostFormState = {
  categoryIds: [],
  contentHtml: "",
  contentText: "",
  excerpt: "",
  featuredImageId: "",
  publishedAt: "",
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
  const [form, setForm] = useState<PostFormState>(emptyForm);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
  const loadPostMutation = useMutation({
    mutationFn: (postId: string) => getPost(token, postId),
    onSuccess: (post) => setForm(toFormState(post)),
  });
  const savePostMutation = useMutation({
    mutationFn: async (input: PostFormState) => {
      if (input.id) {
        return updatePost(token, input.id, input);
      }

      return createPost(token, input);
    },
    onSuccess: async (post) => {
      setForm(toFormState(post));
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      notify({ message: "Blog post has been saved.", title: "Post saved", variant: "success" });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (postId: string) => deletePost(token, postId),
    onSuccess: async () => {
      setPendingDeleteId(null);
      if (pendingDeleteId === form.id) {
        startCreate();
      }
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      notify({
        message: "Blog post has been moved to deleted.",
        title: "Post deleted",
        variant: "success",
      });
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
    loadPostMutation.error ??
    savePostMutation.error ??
    deleteMutation.error;

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
              onClick={() => editPost(post.id)}
            >
              <CmsIcon name="edit" />
            </button>
          </PermissionGate>
          <PermissionGate permission={Permission.BLOG_POSTS_DELETE}>
            <button
              aria-label={`Delete ${post.title}`}
              type="button"
              onClick={() => setPendingDeleteId(post.id)}
            >
              <CmsIcon name="trash" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  function handleSearch(formData: FormData) {
    setFilters((current) => ({
      ...current,
      categoryId: String(formData.get("categoryId") ?? ""),
      page: 1,
      search: String(formData.get("search") ?? ""),
      status: String(formData.get("status") ?? ""),
      tagId: String(formData.get("tagId") ?? ""),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    savePostMutation.mutate(form);
  }

  function editPost(postId: string) {
    loadPostMutation.mutate(postId);
  }

  function startCreate() {
    setForm(emptyForm);
  }

  return (
    <section className="pages-page blog-page">
      <PageHeader
        eyebrow="Content"
        title="Blog"
        actions={
          <PermissionGate permission={Permission.BLOG_POSTS_CREATE}>
            <Button type="button" onClick={startCreate}>
              <CmsIcon name="plus" />
              New post
            </Button>
          </PermissionGate>
        }
      />

      {error && <ErrorState error={error} fallback="Unable to load blog posts." />}

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
            onSearch={handleSearch}
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
          permission={form.id ? Permission.BLOG_POSTS_EDIT : Permission.BLOG_POSTS_CREATE}
        >
          <Card className="form-panel">
            <PostForm
              categories={categories}
              form={form}
              isLoading={loadPostMutation.isPending}
              isSaving={savePostMutation.isPending}
              onChange={setForm}
              onSubmit={handleSubmit}
              tags={tags}
              token={token}
              validationError={savePostMutation.error}
            />
          </Card>
        </PermissionGate>
      </div>

      <ConfirmDialog
        confirmLabel="Delete"
        description="Move this post to deleted status and deactivate its slug?"
        isOpen={Boolean(pendingDeleteId)}
        isPending={deleteMutation.isPending}
        title="Delete post"
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) {
            deleteMutation.mutate(pendingDeleteId);
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
  onSubmit,
  tags,
  token,
  validationError,
}: {
  categories: AdminCategory[];
  form: PostFormState;
  isLoading: boolean;
  isSaving: boolean;
  onChange: (form: PostFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  tags: AdminTag[];
  token: string;
  validationError: unknown;
}) {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

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

      <fieldset className="taxonomy-fieldset">
        <legend>Categories</legend>
        <div className="choice-list">
          {categories.map((category) => (
            <label key={category.id}>
              <input
                checked={form.categoryIds.includes(category.id)}
                type="checkbox"
                onChange={() =>
                  onChange({
                    ...form,
                    categoryIds: toggleId(form.categoryIds, category.id),
                  })
                }
              />
              <span>{category.name}</span>
            </label>
          ))}
          {categories.length === 0 && <small>No categories available.</small>}
        </div>
      </fieldset>

      <fieldset className="taxonomy-fieldset">
        <legend>Tags</legend>
        <div className="choice-list">
          {tags.map((tag) => (
            <label key={tag.id}>
              <input
                checked={form.tagIds.includes(tag.id)}
                type="checkbox"
                onChange={() =>
                  onChange({
                    ...form,
                    tagIds: toggleId(form.tagIds, tag.id),
                  })
                }
              />
              <span>{tag.name}</span>
            </label>
          ))}
          {tags.length === 0 && <small>No tags available.</small>}
        </div>
      </fieldset>

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

      <Button disabled={isSaving || isLoading} type="submit">
        {isSaving ? "Saving" : form.id ? "Save changes" : "Create post"}
      </Button>

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

function toFormState(post: AdminPostDetail): PostFormState {
  return {
    categoryIds: post.categories.map((category) => category.id),
    contentHtml: post.contentHtml ?? "",
    contentText: post.contentText ?? "",
    excerpt: post.excerpt ?? "",
    featuredImageId: post.featuredImageId ?? "",
    id: post.id,
    publishedAt: post.publishedAt ?? "",
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
