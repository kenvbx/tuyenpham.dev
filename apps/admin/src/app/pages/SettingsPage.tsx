import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { ValidationSummary } from "../components/ValidationSummary";
import { useToast } from "../components/toast-context";
import {
  clearSettingsCache,
  getSettings,
  testEmailSettings,
  updateSettings,
  type SettingValue,
  type SettingsSnapshot,
} from "../lib/api";

type SettingsNamespace = "appearance" | "cache" | "email" | "media" | "seo" | "site";

type SettingsTab = {
  label: string;
  namespace: SettingsNamespace;
};

type SettingsFormState = Record<SettingsNamespace, Record<string, SettingValue>>;

const tabs: SettingsTab[] = [
  { label: "General", namespace: "site" },
  { label: "SEO", namespace: "seo" },
  { label: "Media", namespace: "media" },
  { label: "Appearance", namespace: "appearance" },
  { label: "Email", namespace: "email" },
  { label: "Cache", namespace: "cache" },
];

const defaultSettings: SettingsFormState = {
  appearance: {
    "custom-css": "",
    "custom-js": "",
    "logo-url": "",
    "sidebar-mode": "expanded",
    "theme-color": "#1f6feb",
  },
  cache: {
    "ttl-seconds": 300,
  },
  email: {
    provider: "smtp",
    "smtp-from-email": "",
    "smtp-host": "",
    "smtp-port": 587,
    "smtp-user": "",
  },
  media: {
    "allowed-mime-types": "image/jpeg,image/png,image/webp,application/pdf",
    "max-file-size-mb": 10,
  },
  seo: {
    "default-meta-description": "",
    "default-meta-title": "",
    "og-image-url": "",
    "robots-txt": "User-agent: *\nAllow: /",
  },
  site: {
    "favicon-url": "",
    "logo-url": "",
    name: "Tuyen Pham CMS",
    timezone: "Asia/Ho_Chi_Minh",
  },
};

export function SettingsPage() {
  const auth = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const token = auth.token ?? "";
  const [activeNamespace, setActiveNamespace] = useState<SettingsNamespace>("site");
  const [draft, setDraft] = useState<SettingsSnapshot>({});
  const [testRecipient, setTestRecipient] = useState("");
  const settingsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getSettings(token),
    queryKey: ["settings", "snapshot"],
  });
  const saveSettingsMutation = useMutation({
    mutationFn: (namespace: SettingsNamespace) =>
      updateSettings(token, {
        namespace,
        values: form[namespace],
      }),
    onSuccess: async () => {
      setDraft({});
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      notify({
        message: "Settings have been saved.",
        title: "Settings saved",
        variant: "success",
      });
    },
  });
  const testEmailMutation = useMutation({
    mutationFn: () => testEmailSettings(token, testRecipient),
    onSuccess: (result) => {
      notify({
        message: `Test email accepted for ${result.recipient}.`,
        title: "Email test complete",
        variant: "success",
      });
    },
  });
  const clearCacheMutation = useMutation({
    mutationFn: () => clearSettingsCache(token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      notify({
        message: "Public cache has been cleared.",
        title: "Cache cleared",
        variant: "success",
      });
    },
  });

  const form = mergeSettings(mergeSettings(defaultSettings, settingsQuery.data ?? {}), draft);
  const activeTabLabel = tabs.find((tab) => tab.namespace === activeNamespace)?.label ?? "General";
  const error = settingsQuery.error ?? saveSettingsMutation.error;

  function updateField(namespace: SettingsNamespace, key: string, value: SettingValue) {
    setDraft((current) => ({
      ...current,
      [namespace]: {
        ...(current[namespace] ?? {}),
        [key]: value,
      },
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveSettingsMutation.mutate(activeNamespace);
  }

  return (
    <section className="settings-page">
      <PageHeader eyebrow="System" title="Settings" />

      {error && <ErrorState error={error} fallback="Unable to load settings." />}
      {settingsQuery.isLoading ? (
        <LoadingState description="Fetching settings snapshot." title="Loading settings" />
      ) : (
        <div className="settings-layout">
          <Card className="settings-tabs" aria-label="Settings sections">
            {tabs.map((tab) => (
              <button
                key={tab.namespace}
                aria-pressed={activeNamespace === tab.namespace}
                className={activeNamespace === tab.namespace ? "is-active" : undefined}
                type="button"
                onClick={() => setActiveNamespace(tab.namespace)}
              >
                <CmsIcon name="settings" />
                {tab.label}
              </button>
            ))}
          </Card>

          <Card className="settings-panel">
            <header>
              <p>{activeTabLabel}</p>
              <h3>{activeTabLabel} settings</h3>
            </header>

            <PermissionGate permission={Permission.SETTINGS_GENERAL}>
              <form className="settings-form" onSubmit={handleSubmit}>
                <SettingsFields
                  form={form}
                  namespace={activeNamespace}
                  onChange={updateField}
                  onClearCache={() => clearCacheMutation.mutate()}
                  onTestEmail={() => testEmailMutation.mutate()}
                  testRecipient={testRecipient}
                  setTestRecipient={setTestRecipient}
                  isClearingCache={clearCacheMutation.isPending}
                  isTestingEmail={testEmailMutation.isPending}
                />

                {Boolean(saveSettingsMutation.error) && (
                  <ValidationSummary
                    error={saveSettingsMutation.error}
                    fallback="Unable to save settings."
                  />
                )}
                {Boolean(testEmailMutation.error) && (
                  <ValidationSummary
                    error={testEmailMutation.error}
                    fallback="Unable to test email settings."
                  />
                )}
                {Boolean(clearCacheMutation.error) && (
                  <ValidationSummary
                    error={clearCacheMutation.error}
                    fallback="Unable to clear cache."
                  />
                )}

                <div className="form-actions">
                  <Button disabled={saveSettingsMutation.isPending} type="submit">
                    <CmsIcon name="settings" />
                    {saveSettingsMutation.isPending ? "Saving" : "Save settings"}
                  </Button>
                </div>
              </form>
            </PermissionGate>
          </Card>
        </div>
      )}
    </section>
  );
}

type SettingsFieldsProps = {
  form: SettingsFormState;
  isClearingCache: boolean;
  isTestingEmail: boolean;
  namespace: SettingsNamespace;
  onChange: (namespace: SettingsNamespace, key: string, value: SettingValue) => void;
  onClearCache: () => void;
  onTestEmail: () => void;
  setTestRecipient: (value: string) => void;
  testRecipient: string;
};

function SettingsFields({
  form,
  isClearingCache,
  isTestingEmail,
  namespace,
  onChange,
  onClearCache,
  onTestEmail,
  setTestRecipient,
  testRecipient,
}: SettingsFieldsProps) {
  if (namespace === "site") {
    return (
      <div className="settings-grid">
        <TextField
          label="Site name"
          value={asString(form.site["name"])}
          onChange={onChange}
          name="name"
          namespace="site"
        />
        <TextField
          label="Logo URL"
          value={asString(form.site["logo-url"])}
          onChange={onChange}
          name="logo-url"
          namespace="site"
        />
        <TextField
          label="Favicon URL"
          value={asString(form.site["favicon-url"])}
          onChange={onChange}
          name="favicon-url"
          namespace="site"
        />
        <TextField
          label="Timezone"
          value={asString(form.site["timezone"])}
          onChange={onChange}
          name="timezone"
          namespace="site"
        />
      </div>
    );
  }

  if (namespace === "seo") {
    return (
      <div className="settings-grid">
        <TextField
          label="Default meta title"
          value={asString(form.seo["default-meta-title"])}
          onChange={onChange}
          name="default-meta-title"
          namespace="seo"
        />
        <TextField
          label="OG image URL"
          value={asString(form.seo["og-image-url"])}
          onChange={onChange}
          name="og-image-url"
          namespace="seo"
        />
        <TextAreaField
          label="Default meta description"
          value={asString(form.seo["default-meta-description"])}
          onChange={onChange}
          name="default-meta-description"
          namespace="seo"
          rows={4}
        />
        <TextAreaField
          label="Robots.txt"
          value={asString(form.seo["robots-txt"])}
          onChange={onChange}
          name="robots-txt"
          namespace="seo"
          rows={6}
        />
      </div>
    );
  }

  if (namespace === "media") {
    return (
      <div className="settings-grid">
        <NumberField
          label="Max file size MB"
          value={asNumber(form.media["max-file-size-mb"])}
          onChange={onChange}
          name="max-file-size-mb"
          namespace="media"
        />
        <TextAreaField
          label="Allowed MIME types"
          value={asString(form.media["allowed-mime-types"])}
          onChange={onChange}
          name="allowed-mime-types"
          namespace="media"
          rows={5}
        />
      </div>
    );
  }

  if (namespace === "appearance") {
    return (
      <div className="settings-grid">
        <label className="cms-field">
          <span>Sidebar mode</span>
          <select
            value={asString(form.appearance["sidebar-mode"])}
            onChange={(event) => onChange("appearance", "sidebar-mode", event.target.value)}
          >
            <option value="expanded">Expanded</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        <TextField
          label="Admin logo URL"
          value={asString(form.appearance["logo-url"])}
          onChange={onChange}
          name="logo-url"
          namespace="appearance"
        />
        <TextField
          label="Theme color"
          type="color"
          value={asString(form.appearance["theme-color"])}
          onChange={onChange}
          name="theme-color"
          namespace="appearance"
        />
        <TextAreaField
          label="Custom CSS"
          value={asString(form.appearance["custom-css"])}
          onChange={onChange}
          name="custom-css"
          namespace="appearance"
          rows={8}
        />
        <TextAreaField
          label="Custom JS"
          value={asString(form.appearance["custom-js"])}
          onChange={onChange}
          name="custom-js"
          namespace="appearance"
          rows={8}
        />
      </div>
    );
  }

  if (namespace === "email") {
    return (
      <div className="settings-grid">
        <label className="cms-field">
          <span>Provider</span>
          <select
            value={asString(form.email["provider"])}
            onChange={(event) => onChange("email", "provider", event.target.value)}
          >
            <option value="smtp">SMTP</option>
            <option value="resend">Resend</option>
            <option value="mailgun">Mailgun</option>
          </select>
        </label>
        <TextField
          label="SMTP host"
          value={asString(form.email["smtp-host"])}
          onChange={onChange}
          name="smtp-host"
          namespace="email"
        />
        <NumberField
          label="SMTP port"
          value={asNumber(form.email["smtp-port"])}
          onChange={onChange}
          name="smtp-port"
          namespace="email"
        />
        <TextField
          label="SMTP user"
          value={asString(form.email["smtp-user"])}
          onChange={onChange}
          name="smtp-user"
          namespace="email"
        />
        <TextField
          label="From email"
          type="email"
          value={asString(form.email["smtp-from-email"])}
          onChange={onChange}
          name="smtp-from-email"
          namespace="email"
        />
        <div className="settings-inline-action">
          <label className="cms-field">
            <span>Test recipient</span>
            <Input
              type="email"
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
            />
          </label>
          <Button
            disabled={isTestingEmail || !testRecipient}
            type="button"
            variant="secondary"
            onClick={onTestEmail}
          >
            <CmsIcon name="settings" />
            {isTestingEmail ? "Testing" : "Send test"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-grid">
      <NumberField
        label="Public cache TTL seconds"
        value={asNumber(form.cache["ttl-seconds"])}
        onChange={onChange}
        name="ttl-seconds"
        namespace="cache"
      />
      <div className="settings-inline-action">
        <span>
          <strong>Public cache</strong>
          <small>Pages, menus, tags, settings, sitemap and robots responses.</small>
        </span>
        <Button disabled={isClearingCache} type="button" variant="secondary" onClick={onClearCache}>
          <CmsIcon name="settings" />
          {isClearingCache ? "Clearing" : "Clear cache"}
        </Button>
      </div>
    </div>
  );
}

type BaseFieldProps = {
  label: string;
  name: string;
  namespace: SettingsNamespace;
  onChange: (namespace: SettingsNamespace, key: string, value: SettingValue) => void;
};

type TextFieldProps = BaseFieldProps & {
  type?: "color" | "email" | "text";
  value: string;
};

function TextField({ label, name, namespace, onChange, type = "text", value }: TextFieldProps) {
  return (
    <label className="cms-field">
      <span>{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(namespace, name, event.target.value)}
      />
    </label>
  );
}

type NumberFieldProps = BaseFieldProps & {
  value: number;
};

function NumberField({ label, name, namespace, onChange, value }: NumberFieldProps) {
  return (
    <label className="cms-field">
      <span>{label}</span>
      <Input
        min={0}
        type="number"
        value={value}
        onChange={(event) => onChange(namespace, name, Number(event.target.value))}
      />
    </label>
  );
}

type TextAreaFieldProps = BaseFieldProps & {
  rows?: number;
  value: string;
};

function TextAreaField({ label, name, namespace, onChange, rows = 4, value }: TextAreaFieldProps) {
  return (
    <label className="cms-field settings-field-wide">
      <span>{label}</span>
      <textarea
        className="cms-textarea"
        rows={rows}
        value={value}
        onChange={(event) => onChange(namespace, name, event.target.value)}
      />
    </label>
  );
}

function mergeSettings(current: SettingsFormState, snapshot: SettingsSnapshot): SettingsFormState {
  return {
    appearance: { ...current.appearance, ...snapshot["appearance"] },
    cache: { ...current.cache, ...snapshot["cache"] },
    email: { ...current.email, ...snapshot["email"] },
    media: { ...current.media, ...snapshot["media"] },
    seo: { ...current.seo, ...snapshot["seo"] },
    site: { ...current.site, ...snapshot["site"] },
  };
}

function asString(value: SettingValue | undefined): string {
  if (Array.isArray(value)) {
    return value.join(",");
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function asNumber(value: SettingValue | undefined): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value) || 0;
  }

  return 0;
}
