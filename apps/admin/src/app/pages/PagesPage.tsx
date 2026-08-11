import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { MediaPickerModal } from "../components/MediaPickerModal";
import { Modal } from "../components/Modal";
import { ErrorState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { ValidationSummary } from "../components/ValidationSummary";
import { useToast } from "../components/toast-context";
import {
  createPage,
  deletePage,
  getPage,
  getPagePreview,
  listPageRevisions,
  listPages,
  restorePageRevision,
  suggestPageSlug,
  updatePage,
  updatePageStatus,
  type AdminPageDetail,
  type AdminPagePreview,
  type AdminPageRevision,
  type AdminPageStatus,
  type AdminPageSummary,
  type PageFormInput,
} from "../lib/api";

const statusOptions = ["draft", "published", "scheduled", "archived"] as const;

type PageFormState = PageFormInput & {
  id?: string;
  seo: NonNullable<PageFormInput["seo"]>;
};

const emptyForm: PageFormState = {
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
  title: "",
};

export function PagesPage() {
  const auth = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const token = auth.token ?? "";
  const [filters, setFilters] = useState({ page: 1, perPage: 10, search: "", status: "" });
  const [form, setForm] = useState<PageFormState>(emptyForm);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [preview, setPreview] = useState<AdminPagePreview | null>(null);
  const pagesQueryKey = ["pages", filters];

  const pagesQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () =>
      listPages(token, {
        page: filters.page,
        perPage: filters.perPage,
        search: filters.search || undefined,
        status: filters.status || undefined,
      }),
    queryKey: pagesQueryKey,
  });
  const slugSuggestionQuery = useQuery({
    enabled: Boolean(token && form.title),
    queryFn: () =>
      suggestPageSlug(token, {
        pageId: form.id,
        slug: form.slug || undefined,
        title: form.slug ? undefined : form.title,
      }),
    queryKey: ["pages", "slug-suggestion", form.id, form.slug, form.title],
  });
  const revisionsQuery = useQuery({
    enabled: Boolean(token && form.id),
    queryFn: () => listPageRevisions(token, form.id ?? ""),
    queryKey: ["pages", form.id, "revisions"],
  });

  const loadPageMutation = useMutation({
    mutationFn: (pageId: string) => getPage(token, pageId),
    onSuccess: (page) => setForm(toFormState(page)),
  });
  const savePageMutation = useMutation({
    mutationFn: async (input: PageFormState) => {
      if (input.id) {
        return updatePage(token, input.id, input);
      }

      return createPage(token, input);
    },
    onSuccess: async (page) => {
      setForm(toFormState(page));
      await queryClient.invalidateQueries({ queryKey: ["pages"] });
      notify({ message: "Page content has been saved.", title: "Page saved", variant: "success" });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ pageId, status }: { pageId: string; status: AdminPageStatus }) =>
      updatePageStatus(token, pageId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pages"] });
      notify({
        message: "Page status has been updated.",
        title: "Status updated",
        variant: "success",
      });
    },
  });
  const previewMutation = useMutation({
    mutationFn: (pageId: string) => getPagePreview(token, pageId),
    onSuccess: (pagePreview) => setPreview(pagePreview),
  });
  const restoreRevisionMutation = useMutation({
    mutationFn: ({ pageId, revisionId }: { pageId: string; revisionId: string }) =>
      restorePageRevision(token, pageId, revisionId),
    onSuccess: async (page) => {
      setForm(toFormState(page));
      await queryClient.invalidateQueries({ queryKey: ["pages"] });
      notify({
        message: "Page has been restored from a revision.",
        title: "Revision restored",
        variant: "success",
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (pageId: string) => deletePage(token, pageId),
    onSuccess: async () => {
      setPendingDeleteId(null);
      if (pendingDeleteId === form.id) {
        startCreate();
      }
      await queryClient.invalidateQueries({ queryKey: ["pages"] });
      notify({
        message: "Page has been moved to deleted.",
        title: "Page deleted",
        variant: "success",
      });
    },
  });

  const pages = pagesQuery.data?.data ?? [];
  const pagination = pagesQuery.data?.pagination;
  const error =
    pagesQuery.error ??
    loadPageMutation.error ??
    savePageMutation.error ??
    statusMutation.error ??
    previewMutation.error ??
    revisionsQuery.error ??
    restoreRevisionMutation.error ??
    deleteMutation.error;

  const columns: DataTableColumn<AdminPageSummary>[] = [
    {
      header: "Page",
      id: "page",
      render: (page) => (
        <>
          <strong>{page.title}</strong>
          <span>/{page.slug?.key ?? "no-slug"}</span>
        </>
      ),
      sortable: true,
      sortValue: (page) => page.title,
    },
    {
      header: "Status",
      id: "status",
      render: (page) => (
        <span className={`status-pill status-pill--${page.status}`}>{page.status}</span>
      ),
      sortable: true,
      sortValue: (page) => page.status,
    },
    {
      header: "Publish date",
      id: "publishedAt",
      render: (page) => formatDate(page.publishedAt),
      sortable: true,
      sortValue: (page) => page.publishedAt ?? "",
    },
    {
      header: "Updated",
      id: "updatedAt",
      render: (page) => formatDate(page.updatedAt),
      sortable: true,
      sortValue: (page) => page.updatedAt,
    },
    {
      align: "right",
      header: "Actions",
      id: "actions",
      render: (page) => (
        <div className="row-actions">
          <PermissionGate permission={Permission.PAGES_EDIT}>
            <button
              aria-label={`Edit ${page.title}`}
              type="button"
              onClick={() => editPage(page.id)}
            >
              <CmsIcon name="edit" />
            </button>
          </PermissionGate>
          <PermissionGate permission={Permission.PAGES_PUBLISH}>
            <button
              aria-label={`Publish ${page.title}`}
              disabled={page.status === "published" || statusMutation.isPending}
              type="button"
              onClick={() => statusMutation.mutate({ pageId: page.id, status: "published" })}
            >
              <CmsIcon name="fileText" />
            </button>
          </PermissionGate>
          <PermissionGate permission={Permission.PAGES_EDIT}>
            <button
              aria-label={`Archive ${page.title}`}
              disabled={page.status === "archived" || statusMutation.isPending}
              type="button"
              onClick={() => statusMutation.mutate({ pageId: page.id, status: "archived" })}
            >
              <CmsIcon name="settings" />
            </button>
          </PermissionGate>
          <PermissionGate permission={Permission.PAGES_DELETE}>
            <button
              aria-label={`Delete ${page.title}`}
              type="button"
              onClick={() => setPendingDeleteId(page.id)}
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
      page: 1,
      search: String(formData.get("search") ?? ""),
      status: String(formData.get("status") ?? ""),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    savePageMutation.mutate(form);
  }

  function editPage(pageId: string) {
    loadPageMutation.mutate(pageId);
  }

  function startCreate() {
    setForm(emptyForm);
  }

  return (
    <section className="pages-page">
      <PageHeader
        eyebrow="Content"
        title="Pages"
        actions={
          <PermissionGate permission={Permission.PAGES_CREATE}>
            <Button type="button" onClick={startCreate}>
              <CmsIcon name="plus" />
              New page
            </Button>
          </PermissionGate>
        }
      />

      {error && <ErrorState error={error} fallback="Unable to load pages." />}

      <div className="pages-layout">
        <Card className="table-panel">
          <DataTable
            columns={columns}
            data={pages}
            emptyDescription="Create the first CMS page."
            emptyTitle="No pages found"
            filters={
              <select name="status" defaultValue={filters.status}>
                <option value="">All status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            }
            getRowKey={(page) => page.id}
            isLoading={pagesQuery.isLoading}
            loadingDescription="Fetching CMS pages."
            loadingTitle="Loading pages"
            onSearch={handleSearch}
            pagination={
              pagination
                ? {
                    label: `${pagination.total} pages`,
                    onPageChange: (page) => setFilters((current) => ({ ...current, page })),
                    page: pagination.page,
                    pageCount: pagination.pageCount,
                  }
                : undefined
            }
            searchDefaultValue={filters.search}
            searchPlaceholder="Search pages"
          />
        </Card>

        <PermissionGate permission={form.id ? Permission.PAGES_EDIT : Permission.PAGES_CREATE}>
          <Card className="form-panel">
            <PageForm
              form={form}
              isLoading={loadPageMutation.isPending}
              isSaving={savePageMutation.isPending}
              onPreview={(pageId) => previewMutation.mutate(pageId)}
              onRestoreRevision={(revisionId) => {
                if (form.id) {
                  restoreRevisionMutation.mutate({ pageId: form.id, revisionId });
                }
              }}
              onChange={setForm}
              onSubmit={handleSubmit}
              revisions={revisionsQuery.data ?? []}
              revisionsLoading={revisionsQuery.isFetching || restoreRevisionMutation.isPending}
              token={token}
              slug={slugSuggestionQuery.data}
              validationError={savePageMutation.error}
            />
          </Card>
        </PermissionGate>
      </div>

      <ConfirmDialog
        confirmLabel="Delete"
        description="Move this page to deleted status and deactivate its slug?"
        isOpen={Boolean(pendingDeleteId)}
        isPending={deleteMutation.isPending}
        title="Delete page"
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) {
            deleteMutation.mutate(pendingDeleteId);
          }
        }}
      />
      <PreviewModal preview={preview} onClose={() => setPreview(null)} />
    </section>
  );
}

function PageForm({
  form,
  isLoading,
  isSaving,
  onChange,
  onPreview,
  onRestoreRevision,
  onSubmit,
  revisions,
  revisionsLoading,
  slug,
  token,
  validationError,
}: {
  form: PageFormState;
  isLoading: boolean;
  isSaving: boolean;
  onChange: (form: PageFormState) => void;
  onPreview: (pageId: string) => void;
  onRestoreRevision: (revisionId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  revisions: AdminPageRevision[];
  revisionsLoading: boolean;
  slug: { changed: boolean; slug: string } | undefined;
  token: string;
  validationError: unknown;
}) {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  return (
    <form className="page-form" onSubmit={onSubmit}>
      <div>
        <p>{form.id ? "Edit page" : "Create page"}</p>
        <h3>{form.id ? form.title : "New CMS page"}</h3>
      </div>

      {Boolean(validationError) && (
        <ValidationSummary error={validationError} fallback="Unable to save page." />
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
          placeholder={slug?.slug ?? "auto-generated-from-title"}
          value={form.slug}
          onChange={(event) => onChange({ ...form, slug: normalizeSlug(event.target.value) })}
        />
        <small>
          {slug?.changed ? `Available as /${slug.slug}` : `Slug will be /${slug?.slug ?? "..."}`}
        </small>
      </label>

      <div className="form-grid">
        <label>
          Status
          <select
            disabled={isLoading}
            value={form.status}
            onChange={(event) =>
              onChange({ ...form, status: event.target.value as PageFormState["status"] })
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
        {isSaving ? "Saving" : form.id ? "Save changes" : "Create page"}
      </Button>
      {form.id && (
        <Button
          disabled={isSaving || isLoading}
          type="button"
          variant="secondary"
          onClick={() => onPreview(form.id ?? "")}
        >
          <CmsIcon name="fileText" />
          Preview
        </Button>
      )}

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

function RevisionPanel({
  isLoading,
  onRestore,
  revisions,
}: {
  isLoading: boolean;
  onRestore: (revisionId: string) => void;
  revisions: AdminPageRevision[];
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

function PreviewModal({
  onClose,
  preview,
}: {
  onClose: () => void;
  preview: AdminPagePreview | null;
}) {
  return (
    <Modal isOpen={Boolean(preview)} title="Page preview" onClose={onClose}>
      {preview && (
        <div className="page-preview-modal">
          <div className="preview-meta">
            <span>Expires {formatDate(preview.expiresAt)}</span>
            <a href={preview.previewUrl} target="_blank" rel="noreferrer">
              Open signed preview
            </a>
          </div>
          <iframe title={`Preview ${preview.page.title}`} srcDoc={preview.html} />
        </div>
      )}
    </Modal>
  );
}

function toFormState(page: AdminPageDetail): PageFormState {
  return {
    contentHtml: page.contentHtml ?? "",
    contentText: page.contentText ?? "",
    excerpt: page.excerpt ?? "",
    featuredImageId: page.featuredImageId ?? "",
    id: page.id,
    publishedAt: page.publishedAt ?? "",
    seo: {
      canonicalUrl: page.seo?.canonicalUrl ?? "",
      metaDescription: page.seo?.metaDescription ?? "",
      metaTitle: page.seo?.metaTitle ?? "",
      nofollow: page.seo?.nofollow ?? false,
      noindex: page.seo?.noindex ?? false,
      ogDescription: page.seo?.ogDescription ?? "",
      ogImageId: page.seo?.ogImageId ?? "",
      ogImageUrl: page.seo?.ogImageUrl ?? "",
      ogTitle: page.seo?.ogTitle ?? "",
    },
    slug: page.slug?.key ?? "",
    status: page.status as AdminPageStatus,
    title: page.title,
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
