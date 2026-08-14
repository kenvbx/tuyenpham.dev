import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import type { Editor } from "ckeditor5";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { MediaPickerModal } from "../components/MediaPickerModal";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { ValidationSummary } from "../components/ValidationSummary";
import { useToast } from "../components/toast-context";
import {
  createPost,
  getPost,
  listCategories,
  listPostRevisions,
  listPosts,
  listTags,
  restorePostRevision,
  suggestPostSlug,
  updatePost,
  type AdminPostDetail,
  type AdminPostRevision,
  type AdminPostStatus,
  type PostFormInput,
} from "../lib/api";

const statusOptions = ["draft", "published", "scheduled", "archived"] as const;

type PostFormState = PostFormInput & {
  categoryIds: string[];
  id?: string;
  relatedPostIds: string[];
  seo: NonNullable<PostFormInput["seo"]>;
  tagIds: string[];
};

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

export function PostEditorPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const token = auth.token ?? "";
  const postId = params["postId"];
  const isEditing = Boolean(postId);
  const [form, setForm] = useState<PostFormState>(emptyPostForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const postQuery = useQuery({
    enabled: Boolean(token && postId),
    queryFn: () => getPost(token, postId ?? ""),
    queryKey: ["posts", postId],
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
  const postOptionsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listPosts(token, { page: 1, perPage: 100 }),
    queryKey: ["posts", "options"],
  });
  const slugSuggestionQuery = useQuery({
    enabled: Boolean(token && (form.title || form.slug)),
    queryFn: () =>
      suggestPostSlug(token, {
        postId: form.id,
        slug: slugTouched && form.slug ? form.slug : undefined,
        title: !slugTouched ? form.title : undefined,
      }),
    queryKey: ["posts", "slug-suggestion", form.id, form.slug, form.title, slugTouched],
  });
  const revisionsQuery = useQuery({
    enabled: Boolean(token && form.id),
    queryFn: () => listPostRevisions(token, form.id ?? ""),
    queryKey: ["posts", form.id, "revisions"],
  });

  useEffect(() => {
    if (postQuery.data) {
      // Hydrate the editable draft after the existing post has been fetched.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(toPostFormState(postQuery.data));
      setSlugTouched(Boolean(postQuery.data.slug?.key));
    }
  }, [postQuery.data]);

  const savePostMutation = useMutation({
    mutationFn: async (input: PostFormState) => {
      if (input.id) {
        return updatePost(token, input.id, input);
      }

      return createPost(token, input);
    },
    onSuccess: async (post) => {
      setForm(toPostFormState(post));
      setSlugTouched(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      notify({ message: "Blog post has been saved.", title: "Post saved", variant: "success" });

      if (!isEditing) {
        navigate(`/admin/blog/posts/${post.id}/edit`, { replace: true });
      }
    },
  });
  const restoreRevisionMutation = useMutation({
    mutationFn: ({ currentPostId, revisionId }: { currentPostId: string; revisionId: string }) =>
      restorePostRevision(token, currentPostId, revisionId),
    onSuccess: async (post) => {
      setForm(toPostFormState(post));
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      notify({
        message: "Blog post has been restored from a revision.",
        title: "Revision restored",
        variant: "success",
      });
    },
  });

  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const relatedOptions = useMemo(
    () => (postOptionsQuery.data?.data ?? []).filter((post) => post.id !== form.id),
    [form.id, postOptionsQuery.data?.data],
  );
  const error =
    postQuery.error ??
    categoriesQuery.error ??
    tagsQuery.error ??
    postOptionsQuery.error ??
    slugSuggestionQuery.error ??
    revisionsQuery.error ??
    savePostMutation.error ??
    restoreRevisionMutation.error;

  if (isEditing && !postId) {
    return <Navigate replace to="/admin/blog" />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    savePostMutation.mutate(form);
  }

  function handleTitleChange(title: string) {
    setForm((current) => ({
      ...current,
      seo: {
        ...current.seo,
        metaTitle: current.seo.metaTitle || title,
        ogTitle: current.seo.ogTitle || title,
      },
      slug: slugTouched ? current.slug : normalizeSlug(title),
      title,
    }));
  }

  function handleSlugChange(slug: string) {
    setSlugTouched(true);
    setForm((current) => ({ ...current, slug: normalizeSlug(slug) }));
  }

  return (
    <section className="post-editor-page">
      <PageHeader
        eyebrow="Content"
        status={
          <span className={`status-pill status-pill--${form.status ?? "draft"}`}>
            {form.status ?? "draft"}
          </span>
        }
        title={form.id ? "Edit post" : "Add new post"}
        actions={
          <Link className="cms-button cms-button--secondary" to="/admin/blog">
            Back to posts
          </Link>
        }
      />

      {error && <ErrorState error={error} fallback="Unable to load post editor." />}
      {postQuery.isLoading && <LoadingState description="Fetching post data." title="Loading post" />}

      <PermissionGate
        permission={form.id ? Permission.BLOG_POSTS_EDIT : Permission.BLOG_POSTS_CREATE}
      >
        <form className="post-editor-form" onSubmit={handleSubmit}>
          <div className="post-editor-main">
            <Card className="post-editor-card">
              {Boolean(savePostMutation.error) && (
                <ValidationSummary error={savePostMutation.error} fallback="Unable to save post." />
              )}

              <label className="post-title-field">
                <span>Title</span>
                <Input
                  required
                  disabled={postQuery.isLoading}
                  placeholder="Add title"
                  value={form.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                />
              </label>

              <label className="slug-field">
                <span>Slug</span>
                <Input
                  disabled={postQuery.isLoading}
                  placeholder="auto-generated-from-title"
                  value={form.slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                />
                <small>
                  {slugSuggestionQuery.isFetching
                    ? "Checking slug..."
                    : slugSuggestionQuery.data?.changed
                      ? `Suggested available slug: ${slugSuggestionQuery.data.slug}`
                      : form.slug
                        ? `Permalink: /blog/${form.slug}`
                        : "Slug will be generated from the title."}
                </small>
              </label>

              <label className="content-editor-field">
                <span>Content</span>
                <WordPressEditor
                  disabled={postQuery.isLoading || savePostMutation.isPending}
                  value={form.contentHtml ?? ""}
                  onChange={(contentHtml) =>
                    setForm((current) => ({
                      ...current,
                      contentHtml,
                      contentText: stripHtml(contentHtml),
                    }))
                  }
                />
              </label>
            </Card>
          </div>

          <aside className="post-editor-sidebar">
            <EditorPanel title="Publish">
              <label>
                Status
                <select
                  disabled={postQuery.isLoading}
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as AdminPostStatus,
                    }))
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
                  disabled={postQuery.isLoading}
                  type="datetime-local"
                  value={toDatetimeLocalValue(form.publishedAt)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      publishedAt: fromDatetimeLocalValue(event.target.value),
                    }))
                  }
                />
              </label>
              <Button disabled={savePostMutation.isPending || postQuery.isLoading} type="submit">
                {savePostMutation.isPending ? "Saving" : form.id ? "Update" : "Publish"}
              </Button>
            </EditorPanel>

            <EditorPanel title="Categories">
              <TaxonomyChoices
                emptyLabel="No categories available."
                ids={form.categoryIds}
                items={categories}
                onToggle={(categoryId) =>
                  setForm((current) => ({
                    ...current,
                    categoryIds: toggleId(current.categoryIds, categoryId),
                  }))
                }
              />
            </EditorPanel>

            <EditorPanel title="Tags">
              <TaxonomyChoices
                emptyLabel="No tags available."
                ids={form.tagIds}
                items={tags}
                onToggle={(tagId) =>
                  setForm((current) => ({ ...current, tagIds: toggleId(current.tagIds, tagId) }))
                }
              />
            </EditorPanel>

            <EditorPanel title="Featured image">
              <div className="featured-image-field">
                <Input
                  disabled={postQuery.isLoading}
                  placeholder="Media file ID"
                  value={form.featuredImageId ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, featuredImageId: event.target.value }))
                  }
                />
                <Button type="button" variant="secondary" onClick={() => setIsMediaPickerOpen(true)}>
                  <CmsIcon name="media" />
                  Pick image
                </Button>
              </div>
            </EditorPanel>

            <EditorPanel title="Excerpt">
              <textarea
                disabled={postQuery.isLoading}
                maxLength={1000}
                value={form.excerpt ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, excerpt: event.target.value }))
                }
              />
            </EditorPanel>

            <EditorPanel title="Related posts">
              <TaxonomyChoices
                emptyLabel="No related post options."
                getLabel={(post) => post.title}
                ids={form.relatedPostIds}
                items={relatedOptions}
                onToggle={(relatedPostId) =>
                  setForm((current) => ({
                    ...current,
                    relatedPostIds: toggleId(current.relatedPostIds, relatedPostId),
                  }))
                }
              />
            </EditorPanel>

            <SeoFields form={form} onChange={setForm} />

            {form.id && (
              <RevisionPanel
                isLoading={revisionsQuery.isFetching || restoreRevisionMutation.isPending}
                revisions={revisionsQuery.data ?? []}
                onRestore={(revisionId) => {
                  if (form.id) {
                    restoreRevisionMutation.mutate({ currentPostId: form.id, revisionId });
                  }
                }}
              />
            )}
          </aside>
        </form>
      </PermissionGate>

      <MediaPickerModal
        acceptedType="image"
        isOpen={isMediaPickerOpen}
        token={token}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(file) =>
          setForm((current) => ({
            ...current,
            featuredImageId: file.id,
            seo: {
              ...current.seo,
              ogImageId: current.seo.ogImageId || file.id,
              ogImageUrl: current.seo.ogImageUrl || file.url,
            },
          }))
        }
      />
    </section>
  );
}

function WordPressEditor({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="wordpress-editor">
      <CKEditor
        config={{
          toolbar: [
            "heading",
            "|",
            "bold",
            "italic",
            "link",
            "bulletedList",
            "numberedList",
            "|",
            "blockQuote",
            "insertTable",
            "mediaEmbed",
            "|",
            "undo",
            "redo",
          ],
        }}
        data={value}
        disabled={disabled}
        editor={ClassicEditor}
        onChange={(_, editor: Editor) => onChange(editor.getData())}
      />
    </div>
  );
}

function EditorPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Card className="post-editor-panel">
      <h3>{title}</h3>
      <div>{children}</div>
    </Card>
  );
}

function TaxonomyChoices<TItem extends { id: string; name?: string; title?: string }>({
  emptyLabel,
  getLabel = (item) => item.name ?? item.title ?? item.id,
  ids,
  items,
  onToggle,
}: {
  emptyLabel: string;
  getLabel?: (item: TItem) => string;
  ids: string[];
  items: TItem[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="choice-list compact-choice-list">
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
    <EditorPanel title="SEO">
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
    </EditorPanel>
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
    <EditorPanel title="Revisions">
      {isLoading && <span className="panel-note">Loading revisions</span>}
      {revisions.length === 0 ? (
        <p className="panel-note">No revisions yet.</p>
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
    </EditorPanel>
  );
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
