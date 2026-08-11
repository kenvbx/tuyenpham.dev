import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { ErrorState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { ValidationSummary } from "../components/ValidationSummary";
import { useToast } from "../components/toast-context";
import {
  createPage,
  deletePage,
  getPage,
  listPages,
  suggestPageSlug,
  updatePage,
  updatePageStatus,
  type AdminPageDetail,
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
              onChange={setForm}
              onSubmit={handleSubmit}
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
    </section>
  );
}

function PageForm({
  form,
  isLoading,
  isSaving,
  onChange,
  onSubmit,
  slug,
  validationError,
}: {
  form: PageFormState;
  isLoading: boolean;
  isSaving: boolean;
  onChange: (form: PageFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  slug: { changed: boolean; slug: string } | undefined;
  validationError: unknown;
}) {
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
        <textarea
          className="content-textarea"
          disabled={isLoading}
          value={form.contentHtml ?? ""}
          onChange={(event) =>
            onChange({
              ...form,
              contentHtml: event.target.value,
              contentText: stripHtml(event.target.value),
            })
          }
        />
      </label>

      <label>
        Featured image ID
        <Input
          disabled={isLoading}
          value={form.featuredImageId ?? ""}
          onChange={(event) => onChange({ ...form, featuredImageId: event.target.value })}
        />
      </label>

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
    </form>
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
