import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { ErrorState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../components/toast-context";
import {
  createGallery,
  deleteContact,
  deleteGallery,
  getAnalyticsSummary,
  getSettings,
  listContacts,
  listGalleries,
  listLanguages,
  listMembers,
  listTranslations,
  replyContact,
  saveLanguage,
  saveTranslation,
  updateContact,
  updateGallery,
  updateMember,
  updateSettings,
  type AdminGallery,
  type AdminMember,
  type ContactSubmission,
  type GalleryInput,
  type Language,
  type TranslationEntry,
} from "../lib/api";

type ModuleTab = "analytics" | "contacts" | "galleries" | "localization" | "members" | "privacy";

const tabs: Array<{ label: string; tab: ModuleTab }> = [
  { label: "Galleries", tab: "galleries" },
  { label: "Contacts", tab: "contacts" },
  { label: "Members", tab: "members" },
  { label: "Localization", tab: "localization" },
  { label: "Analytics", tab: "analytics" },
  { label: "Privacy", tab: "privacy" },
];

const emptyGallery: GalleryInput & { id?: string } = {
  description: "",
  items: [],
  name: "",
  slug: "",
  status: "draft",
};

export function ModulesPage() {
  const auth = useAuth();
  const token = auth.token ?? "";
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ModuleTab>("galleries");
  const [galleryForm, setGalleryForm] = useState(emptyGallery);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [languageForm, setLanguageForm] = useState({ code: "", name: "", nativeName: "" });
  const [translationForm, setTranslationForm] = useState({
    key: "",
    namespace: "common",
    value: "",
  });
  const [privacyForm, setPrivacyForm] = useState({
    analyticsId: "",
    captchaEnabled: false,
    captchaProvider: "turnstile",
    cookieEnabled: true,
    cookiePolicyUrl: "",
    githubEnabled: false,
    googleEnabled: false,
  });
  const galleriesQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listGalleries(token),
    queryKey: ["galleries"],
  });
  const contactsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listContacts(token),
    queryKey: ["contacts"],
  });
  const membersQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listMembers(token),
    queryKey: ["members"],
  });
  const languagesQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listLanguages(token),
    queryKey: ["localization", "languages"],
  });
  const translationsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listTranslations(token),
    queryKey: ["localization", "translations"],
  });
  const analyticsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getAnalyticsSummary(token),
    queryKey: ["analytics", "summary"],
  });
  const settingsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getSettings(token),
    queryKey: ["settings", "modules"],
  });
  const saveGalleryMutation = useMutation({
    mutationFn: (input: typeof galleryForm) =>
      input.id
        ? updateGallery(token, input.id, normalizeGalleryInput(input))
        : createGallery(token, normalizeGalleryInput(input)),
    onSuccess: async () => {
      setGalleryForm(emptyGallery);
      await queryClient.invalidateQueries({ queryKey: ["galleries"] });
      notify({ message: "Gallery has been saved.", title: "Gallery saved", variant: "success" });
    },
  });
  const deleteGalleryMutation = useMutation({
    mutationFn: (galleryId: string) => deleteGallery(token, galleryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["galleries"] });
      notify({
        message: "Gallery has been deleted.",
        title: "Gallery deleted",
        variant: "success",
      });
    },
  });
  const contactMutation = useMutation({
    mutationFn: (input: {
      contactId: string;
      reply?: string;
      status?: string;
      delete?: boolean;
    }) => {
      if (input.delete) {
        return deleteContact(token, input.contactId);
      }

      if (input.reply) {
        return replyContact(token, input.contactId, input.reply);
      }

      return updateContact(token, input.contactId, input.status ?? "read");
    },
    onSuccess: async () => {
      setReplyDrafts({});
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
      notify({
        message: "Contact has been updated.",
        title: "Contact updated",
        variant: "success",
      });
    },
  });
  const memberMutation = useMutation({
    mutationFn: (input: { memberId: string; status: string }) =>
      updateMember(token, input.memberId, { status: input.status } as Partial<AdminMember>),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      notify({ message: "Member has been updated.", title: "Member updated", variant: "success" });
    },
  });
  const languageMutation = useMutation({
    mutationFn: () =>
      saveLanguage(token, {
        code: languageForm.code,
        isActive: true,
        name: languageForm.name,
        nativeName: languageForm.nativeName || null,
      }),
    onSuccess: async () => {
      setLanguageForm({ code: "", name: "", nativeName: "" });
      await queryClient.invalidateQueries({ queryKey: ["localization"] });
      notify({ message: "Language has been saved.", title: "Language saved", variant: "success" });
    },
  });
  const translationMutation = useMutation({
    mutationFn: () =>
      saveTranslation(token, {
        key: translationForm.key,
        namespace: translationForm.namespace,
        translations: { vi: translationForm.value },
      }),
    onSuccess: async () => {
      setTranslationForm({ key: "", namespace: "common", value: "" });
      await queryClient.invalidateQueries({ queryKey: ["localization", "translations"] });
      notify({
        message: "Translation has been saved.",
        title: "Translation saved",
        variant: "success",
      });
    },
  });
  const privacyMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        updateSettings(token, {
          namespace: "analytics",
          values: { "ga-measurement-id": privacyForm.analyticsId },
        }),
        updateSettings(token, {
          namespace: "captcha",
          values: { enabled: privacyForm.captchaEnabled, provider: privacyForm.captchaProvider },
        }),
        updateSettings(token, {
          namespace: "cookie-consent",
          values: {
            enabled: privacyForm.cookieEnabled,
            "policy-url": privacyForm.cookiePolicyUrl,
            position: "bottom",
          },
        }),
        updateSettings(token, {
          namespace: "social-login",
          values: {
            "github-enabled": privacyForm.githubEnabled,
            "google-enabled": privacyForm.googleEnabled,
          },
        }),
      ]);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      notify({ message: "Module settings saved.", title: "Settings saved", variant: "success" });
    },
  });
  const error =
    galleriesQuery.error ??
    contactsQuery.error ??
    membersQuery.error ??
    languagesQuery.error ??
    translationsQuery.error ??
    analyticsQuery.error ??
    settingsQuery.error;

  const galleryColumns: DataTableColumn<AdminGallery>[] = [
    {
      header: "Gallery",
      id: "gallery",
      render: (gallery) => (
        <>
          <strong>{gallery.name}</strong>
          <span>{gallery.slug}</span>
        </>
      ),
      sortable: true,
      sortValue: (gallery) => gallery.name,
    },
    { header: "Items", id: "items", render: (gallery) => gallery.items.length },
    { header: "Status", id: "status", render: (gallery) => gallery.status },
    {
      align: "right",
      header: "Actions",
      id: "actions",
      render: (gallery) => (
        <div className="row-actions">
          <PermissionGate permission={Permission.GALLERIES_EDIT}>
            <button
              type="button"
              aria-label={`Edit ${gallery.name}`}
              onClick={() => setGalleryForm(toGalleryForm(gallery))}
            >
              <CmsIcon name="edit" />
            </button>
          </PermissionGate>
          <PermissionGate permission={Permission.GALLERIES_DELETE}>
            <button
              type="button"
              aria-label={`Delete ${gallery.name}`}
              onClick={() => deleteGalleryMutation.mutate(gallery.id)}
            >
              <CmsIcon name="trash" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ];
  const contactColumns: DataTableColumn<ContactSubmission>[] = [
    {
      header: "Contact",
      id: "contact",
      render: (contact) => (
        <>
          <strong>{contact.name}</strong>
          <span>{contact.email}</span>
        </>
      ),
    },
    { header: "Subject", id: "subject", render: (contact) => contact.subject ?? "No subject" },
    { header: "Status", id: "status", render: (contact) => contact.status },
    {
      header: "Reply",
      id: "reply",
      render: (contact) => (
        <div className="inline-reply">
          <Input
            value={replyDrafts[contact.id] ?? ""}
            onChange={(event) =>
              setReplyDrafts((current) => ({ ...current, [contact.id]: event.target.value }))
            }
          />
          <Button
            size="sm"
            type="button"
            variant="secondary"
            onClick={() =>
              contactMutation.mutate({
                contactId: contact.id,
                reply: replyDrafts[contact.id] ?? "",
              })
            }
          >
            Reply
          </Button>
        </div>
      ),
    },
    {
      align: "right",
      header: "Actions",
      id: "actions",
      render: (contact) => (
        <div className="row-actions">
          <button
            type="button"
            aria-label="Archive contact"
            onClick={() => contactMutation.mutate({ contactId: contact.id, status: "archived" })}
          >
            <CmsIcon name="settings" />
          </button>
          <button
            type="button"
            aria-label="Delete contact"
            onClick={() => contactMutation.mutate({ contactId: contact.id, delete: true })}
          >
            <CmsIcon name="trash" />
          </button>
        </div>
      ),
    },
  ];
  const memberColumns: DataTableColumn<AdminMember>[] = [
    {
      header: "Member",
      id: "member",
      render: (member) => (
        <>
          <strong>{member.displayName ?? member.email}</strong>
          <span>{member.email}</span>
        </>
      ),
    },
    { header: "Status", id: "status", render: (member) => member.status },
    {
      align: "right",
      header: "Actions",
      id: "actions",
      render: (member) => (
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={() =>
            memberMutation.mutate({
              memberId: member.id,
              status: member.status === "active" ? "suspended" : "active",
            })
          }
        >
          {member.status === "active" ? "Suspend" : "Activate"}
        </Button>
      ),
    },
  ];
  const languageColumns: DataTableColumn<Language>[] = [
    { header: "Code", id: "code", render: (language) => language.code },
    { header: "Name", id: "name", render: (language) => language.name },
    { header: "Default", id: "default", render: (language) => (language.isDefault ? "Yes" : "No") },
  ];
  const translationColumns: DataTableColumn<TranslationEntry>[] = [
    { header: "Namespace", id: "namespace", render: (entry) => entry.namespace },
    { header: "Key", id: "key", render: (entry) => entry.key },
    { header: "VI", id: "vi", render: (entry) => entry.translations["vi"] ?? "" },
  ];

  return (
    <section className="modules-page">
      <PageHeader eyebrow="Modules" title="Extensions" />
      {error && <ErrorState error={error} fallback="Unable to load module data." />}

      <Card className="audit-tabs" aria-label="Module sections">
        {tabs.map((item) => (
          <button
            key={item.tab}
            aria-pressed={activeTab === item.tab}
            className={activeTab === item.tab ? "is-active" : undefined}
            type="button"
            onClick={() => setActiveTab(item.tab)}
          >
            {item.label}
          </button>
        ))}
      </Card>

      {activeTab === "galleries" && (
        <div className="modules-layout">
          <Card className="table-panel">
            <DataTable
              columns={galleryColumns}
              data={galleriesQuery.data ?? []}
              emptyDescription="Create a gallery to group media images."
              emptyTitle="No galleries found"
              getRowKey={(gallery) => gallery.id}
              isLoading={galleriesQuery.isLoading}
              loadingDescription="Fetching galleries."
              loadingTitle="Loading galleries"
            />
          </Card>
          <PermissionGate
            permission={galleryForm.id ? Permission.GALLERIES_EDIT : Permission.GALLERIES_CREATE}
          >
            <GalleryForm
              form={galleryForm}
              isSaving={saveGalleryMutation.isPending}
              onChange={setGalleryForm}
              onSubmit={(event) => {
                event.preventDefault();
                saveGalleryMutation.mutate(galleryForm);
              }}
            />
          </PermissionGate>
        </div>
      )}

      {activeTab === "contacts" && (
        <Card className="table-panel">
          <DataTable
            columns={contactColumns}
            data={contactsQuery.data ?? []}
            emptyDescription="Contact form submissions will appear here."
            emptyTitle="No contacts found"
            getRowKey={(contact) => contact.id}
            isLoading={contactsQuery.isLoading}
            loadingDescription="Fetching contacts."
            loadingTitle="Loading contacts"
          />
        </Card>
      )}

      {activeTab === "members" && (
        <Card className="table-panel">
          <DataTable
            columns={memberColumns}
            data={membersQuery.data ?? []}
            emptyDescription="Public members will appear after registration."
            emptyTitle="No members found"
            getRowKey={(member) => member.id}
            isLoading={membersQuery.isLoading}
            loadingDescription="Fetching members."
            loadingTitle="Loading members"
          />
        </Card>
      )}

      {activeTab === "localization" && (
        <div className="modules-layout">
          <Card className="table-panel">
            <DataTable
              columns={languageColumns}
              data={languagesQuery.data ?? []}
              emptyDescription="Add a language to localize content."
              emptyTitle="No languages found"
              getRowKey={(language) => language.id}
              isLoading={languagesQuery.isLoading}
              loadingDescription="Fetching languages."
              loadingTitle="Loading languages"
            />
            <DataTable
              columns={translationColumns}
              data={translationsQuery.data ?? []}
              emptyDescription="Add static translations for interface labels."
              emptyTitle="No translations found"
              getRowKey={(entry) => entry.id}
              isLoading={translationsQuery.isLoading}
              loadingDescription="Fetching translations."
              loadingTitle="Loading translations"
            />
          </Card>
          <LocalizationForms
            languageForm={languageForm}
            translationForm={translationForm}
            onLanguageChange={setLanguageForm}
            onLanguageSubmit={(event) => {
              event.preventDefault();
              languageMutation.mutate();
            }}
            onTranslationChange={setTranslationForm}
            onTranslationSubmit={(event) => {
              event.preventDefault();
              translationMutation.mutate();
            }}
          />
        </div>
      )}

      {activeTab === "analytics" && (
        <AnalyticsPanel
          total={analyticsQuery.data?.total ?? 0}
          rows={analyticsQuery.data?.topPaths ?? []}
        />
      )}

      {activeTab === "privacy" && (
        <PrivacySettingsForm
          form={privacyForm}
          isSaving={privacyMutation.isPending}
          onChange={setPrivacyForm}
          onSubmit={(event) => {
            event.preventDefault();
            privacyMutation.mutate();
          }}
        />
      )}
    </section>
  );
}

function GalleryForm({
  form,
  isSaving,
  onChange,
  onSubmit,
}: {
  form: GalleryInput & { id?: string };
  isSaving: boolean;
  onChange: (form: GalleryInput & { id?: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="form-panel">
      <form className="module-form" onSubmit={onSubmit}>
        <label className="cms-field">
          <span>Name</span>
          <Input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
          />
        </label>
        <label className="cms-field">
          <span>Slug</span>
          <Input
            value={form.slug}
            onChange={(event) => onChange({ ...form, slug: normalizeSlug(event.target.value) })}
          />
        </label>
        <label className="cms-field">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(event) =>
              onChange({ ...form, status: event.target.value as GalleryInput["status"] })
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="cms-field">
          <span>Description</span>
          <textarea
            className="cms-textarea"
            value={form.description ?? ""}
            onChange={(event) => onChange({ ...form, description: event.target.value })}
          />
        </label>
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving" : "Save gallery"}
        </Button>
      </form>
    </Card>
  );
}

function LocalizationForms({
  languageForm,
  onLanguageChange,
  onLanguageSubmit,
  onTranslationChange,
  onTranslationSubmit,
  translationForm,
}: {
  languageForm: { code: string; name: string; nativeName: string };
  onLanguageChange: (form: { code: string; name: string; nativeName: string }) => void;
  onLanguageSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTranslationChange: (form: { key: string; namespace: string; value: string }) => void;
  onTranslationSubmit: (event: FormEvent<HTMLFormElement>) => void;
  translationForm: { key: string; namespace: string; value: string };
}) {
  return (
    <Card className="form-panel">
      <form className="module-form" onSubmit={onLanguageSubmit}>
        <h3>Language</h3>
        <Input
          placeholder="Code"
          value={languageForm.code}
          onChange={(event) => onLanguageChange({ ...languageForm, code: event.target.value })}
        />
        <Input
          placeholder="Name"
          value={languageForm.name}
          onChange={(event) => onLanguageChange({ ...languageForm, name: event.target.value })}
        />
        <Input
          placeholder="Native name"
          value={languageForm.nativeName}
          onChange={(event) =>
            onLanguageChange({ ...languageForm, nativeName: event.target.value })
          }
        />
        <Button type="submit">Save language</Button>
      </form>
      <form className="module-form" onSubmit={onTranslationSubmit}>
        <h3>Translation</h3>
        <Input
          placeholder="Namespace"
          value={translationForm.namespace}
          onChange={(event) =>
            onTranslationChange({ ...translationForm, namespace: event.target.value })
          }
        />
        <Input
          placeholder="Key"
          value={translationForm.key}
          onChange={(event) => onTranslationChange({ ...translationForm, key: event.target.value })}
        />
        <Input
          placeholder="Vietnamese value"
          value={translationForm.value}
          onChange={(event) =>
            onTranslationChange({ ...translationForm, value: event.target.value })
          }
        />
        <Button type="submit">Save translation</Button>
      </form>
    </Card>
  );
}

function AnalyticsPanel({
  rows,
  total,
}: {
  rows: Array<{ count: number; key: string }>;
  total: number;
}) {
  return (
    <Card className="module-summary">
      <strong>{total}</strong>
      <span>Total tracked events</span>
      <div>
        {rows.slice(0, 8).map((row) => (
          <p key={row.key}>
            <span>{row.key}</span>
            <strong>{row.count}</strong>
          </p>
        ))}
      </div>
    </Card>
  );
}

function PrivacySettingsForm({
  form,
  isSaving,
  onChange,
  onSubmit,
}: {
  form: {
    analyticsId: string;
    captchaEnabled: boolean;
    captchaProvider: string;
    cookieEnabled: boolean;
    cookiePolicyUrl: string;
    githubEnabled: boolean;
    googleEnabled: boolean;
  };
  isSaving: boolean;
  onChange: (form: PrivacySettingsFormProps) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="form-panel">
      <form className="module-form" onSubmit={onSubmit}>
        <Input
          placeholder="GA measurement ID"
          value={form.analyticsId}
          onChange={(event) => onChange({ ...form, analyticsId: event.target.value })}
        />
        <Input
          placeholder="Cookie policy URL"
          value={form.cookiePolicyUrl}
          onChange={(event) => onChange({ ...form, cookiePolicyUrl: event.target.value })}
        />
        <label className="cms-switch">
          <input
            checked={form.cookieEnabled}
            type="checkbox"
            onChange={(event) => onChange({ ...form, cookieEnabled: event.target.checked })}
          />
          <span />
          <strong>Cookie consent</strong>
        </label>
        <label className="cms-switch">
          <input
            checked={form.captchaEnabled}
            type="checkbox"
            onChange={(event) => onChange({ ...form, captchaEnabled: event.target.checked })}
          />
          <span />
          <strong>Captcha</strong>
        </label>
        <select
          value={form.captchaProvider}
          onChange={(event) => onChange({ ...form, captchaProvider: event.target.value })}
        >
          <option value="turnstile">Turnstile</option>
          <option value="hcaptcha">hCaptcha</option>
        </select>
        <label className="cms-switch">
          <input
            checked={form.googleEnabled}
            type="checkbox"
            onChange={(event) => onChange({ ...form, googleEnabled: event.target.checked })}
          />
          <span />
          <strong>Google login</strong>
        </label>
        <label className="cms-switch">
          <input
            checked={form.githubEnabled}
            type="checkbox"
            onChange={(event) => onChange({ ...form, githubEnabled: event.target.checked })}
          />
          <span />
          <strong>GitHub login</strong>
        </label>
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving" : "Save settings"}
        </Button>
      </form>
    </Card>
  );
}

type PrivacySettingsFormProps = {
  analyticsId: string;
  captchaEnabled: boolean;
  captchaProvider: string;
  cookieEnabled: boolean;
  cookiePolicyUrl: string;
  githubEnabled: boolean;
  googleEnabled: boolean;
};

function normalizeGalleryInput(input: GalleryInput): GalleryInput {
  return {
    description: input.description ?? null,
    items: input.items,
    name: input.name,
    slug: input.slug,
    status: input.status,
  };
}

function toGalleryForm(gallery: AdminGallery): GalleryInput & { id: string } {
  return {
    description: gallery.description ?? "",
    id: gallery.id,
    items: gallery.items,
    name: gallery.name,
    slug: gallery.slug,
    status:
      gallery.status === "archived" || gallery.status === "published" ? gallery.status : "draft",
  };
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}
