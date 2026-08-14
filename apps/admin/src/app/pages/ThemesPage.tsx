import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type CSSProperties, type ChangeEvent, type FormEvent, useState } from "react";

import { useAuth } from "../auth/auth-context";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { ValidationSummary } from "../components/ValidationSummary";
import { useToast } from "../components/toast-context";
import {
  activateTheme,
  deleteTheme,
  getThemeConfig,
  installTheme,
  updateThemeConfig,
  type ThemeConfig,
  type ThemeLayout,
  type ThemePalette,
} from "../lib/api";

type ThemeDraft = {
  activeTheme: string;
  customCss: string;
  customJs: string;
  layout: ThemeLayout;
  palette: ThemePalette;
};

const emptyPalette: ThemePalette = {
  accent: "#f59e0b",
  background: "#f8fafc",
  foreground: "#111827",
  muted: "#64748b",
  primary: "#2563eb",
  surface: "#ffffff",
};

const emptyLayout: ThemeLayout = {
  contentWidth: "normal",
  header: "classic",
  radius: "sm",
};

export function ThemesPage() {
  const auth = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const token = auth.token ?? "";
  const [draft, setDraft] = useState<Partial<ThemeDraft>>({});
  const [themePackage, setThemePackage] = useState<File | null>(null);

  const themeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getThemeConfig(token),
    queryKey: ["themes", "config"],
  });
  const saveMutation = useMutation({
    mutationFn: () => updateThemeConfig(token, form),
    onSuccess: async (config) => {
      setDraft({});
      await refreshThemeQueries();
      notify({
        message: `${config.activeTheme.name} settings have been saved.`,
        title: "Theme saved",
        variant: "success",
      });
    },
  });
  const installMutation = useMutation({
    mutationFn: () => {
      if (!themePackage) {
        throw new Error("Theme package file is required.");
      }

      return installTheme(token, themePackage);
    },
    onSuccess: async () => {
      setThemePackage(null);
      await refreshThemeQueries();
      notify({
        message: "Theme package has been installed.",
        title: "Theme installed",
        variant: "success",
      });
    },
  });
  const activateMutation = useMutation({
    mutationFn: (themeId: string) => activateTheme(token, themeId),
    onSuccess: async (config) => {
      setDraft({});
      await refreshThemeQueries();
      notify({
        message: `${config.activeTheme.name} is now active.`,
        title: "Theme activated",
        variant: "success",
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (themeId: string) => deleteTheme(token, themeId),
    onSuccess: async () => {
      setDraft({});
      await refreshThemeQueries();
      notify({
        message: "Theme package has been removed.",
        title: "Theme deleted",
        variant: "success",
      });
    },
  });

  const form = mergeDraft(themeQuery.data, draft);
  const selectedTheme = themeQuery.data?.installedThemes.find(
    (theme) => theme.id === form.activeTheme,
  );
  const error =
    themeQuery.error ??
    saveMutation.error ??
    installMutation.error ??
    activateMutation.error ??
    deleteMutation.error;

  async function refreshThemeQueries() {
    await queryClient.invalidateQueries({ queryKey: ["themes"] });
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
  }

  function selectTheme(themeId: string) {
    const theme = themeQuery.data?.installedThemes.find((item) => item.id === themeId);

    setDraft((current) => ({
      ...current,
      activeTheme: themeId,
      layout: theme?.layout ?? form.layout,
      palette: theme?.palette ?? form.palette,
    }));
  }

  function updatePalette(key: keyof ThemePalette, value: string) {
    setDraft((current) => ({
      ...current,
      palette: {
        ...form.palette,
        ...current.palette,
        [key]: value,
      },
    }));
  }

  function updateLayout(key: keyof ThemeLayout, value: string) {
    setDraft((current) => ({
      ...current,
      layout: {
        ...form.layout,
        ...current.layout,
        [key]: value,
      },
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate();
  }

  function handlePackageChange(event: ChangeEvent<HTMLInputElement>) {
    setThemePackage(event.target.files?.[0] ?? null);
  }

  return (
    <section className="themes-page">
      <PageHeader eyebrow="Appearance" title="Themes" />

      {error && <ErrorState error={error} fallback="Unable to manage themes." />}
      {themeQuery.isLoading ? (
        <LoadingState description="Fetching installed themes." title="Loading themes" />
      ) : (
        <div className="themes-layout">
          <div className="theme-list" aria-label="Installed themes">
            <Card className="theme-install-panel">
              <label className="cms-field">
                <span>Install theme package</span>
                <Input accept=".zip,application/zip" type="file" onChange={handlePackageChange} />
              </label>
              <Button
                disabled={!themePackage || installMutation.isPending}
                type="button"
                variant="secondary"
                onClick={() => installMutation.mutate()}
              >
                <CmsIcon name="plus" />
                {installMutation.isPending ? "Installing" : "Install"}
              </Button>
            </Card>

            {themeQuery.data?.installedThemes.map((theme) => (
              <button
                key={theme.id}
                aria-pressed={form.activeTheme === theme.id}
                className={form.activeTheme === theme.id ? "is-active" : undefined}
                type="button"
                onClick={() => selectTheme(theme.id)}
              >
                <span className="theme-swatch" style={toSwatchStyle(theme.palette)} />
                <span>
                  <strong>{theme.name}</strong>
                  <small>
                    {theme.version} · {theme.source === "builtin" ? "Built-in" : "Installed"}
                  </small>
                  <small>{theme.description}</small>
                </span>
              </button>
            ))}
          </div>

          <form className="theme-editor-form" onSubmit={handleSubmit}>
            <Card className="theme-editor">
              <header>
                <p>{selectedTheme?.source === "uploaded" ? "Installed theme" : "Built-in theme"}</p>
                <h3>{selectedTheme?.name ?? "Theme"}</h3>
              </header>

              <div className="theme-preview" style={toPreviewStyle(form.palette)}>
                <div>
                  <span />
                  <span />
                  <span />
                </div>
                <section>
                  <strong>{selectedTheme?.name ?? "Theme"}</strong>
                  <p>{selectedTheme?.description ?? "Theme preview"}</p>
                </section>
              </div>

              <div className="theme-actions">
                <Button
                  disabled={
                    form.activeTheme === themeQuery.data?.activeTheme.id ||
                    activateMutation.isPending
                  }
                  type="button"
                  onClick={() => activateMutation.mutate(form.activeTheme)}
                >
                  <CmsIcon name="palette" />
                  {activateMutation.isPending ? "Activating" : "Activate"}
                </Button>
                <Button disabled={saveMutation.isPending} type="submit" variant="secondary">
                  <CmsIcon name="settings" />
                  {saveMutation.isPending ? "Saving" : "Save settings"}
                </Button>
                {selectedTheme?.source === "uploaded" && (
                  <Button
                    disabled={deleteMutation.isPending}
                    type="button"
                    variant="danger"
                    onClick={() => deleteMutation.mutate(selectedTheme.id)}
                  >
                    <CmsIcon name="trash" />
                    {deleteMutation.isPending ? "Deleting" : "Delete"}
                  </Button>
                )}
              </div>

              <div className="theme-options">
                <label className="cms-field">
                  <span>Header</span>
                  <select
                    value={form.layout.header}
                    onChange={(event) => updateLayout("header", event.target.value)}
                  >
                    <option value="classic">Classic</option>
                    <option value="minimal">Minimal</option>
                    <option value="centered">Centered</option>
                  </select>
                </label>
                <label className="cms-field">
                  <span>Content width</span>
                  <select
                    value={form.layout.contentWidth}
                    onChange={(event) => updateLayout("contentWidth", event.target.value)}
                  >
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="wide">Wide</option>
                  </select>
                </label>
                <label className="cms-field">
                  <span>Radius</span>
                  <select
                    value={form.layout.radius}
                    onChange={(event) => updateLayout("radius", event.target.value)}
                  >
                    <option value="none">None</option>
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                  </select>
                </label>
              </div>

              <div className="theme-palette-grid">
                {Object.entries(form.palette).map(([key, value]) => (
                  <label key={key} className="cms-field">
                    <span>{toLabel(key)}</span>
                    <Input
                      type="color"
                      value={value}
                      onChange={(event) =>
                        updatePalette(key as keyof ThemePalette, event.target.value)
                      }
                    />
                  </label>
                ))}
              </div>

              <label className="cms-field">
                <span>Custom CSS</span>
                <textarea
                  rows={7}
                  value={form.customCss}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, customCss: event.target.value }))
                  }
                />
              </label>
              <label className="cms-field">
                <span>Custom JS</span>
                <textarea
                  rows={7}
                  value={form.customJs}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, customJs: event.target.value }))
                  }
                />
              </label>

              {Boolean(error) && (
                <ValidationSummary error={error} fallback="Theme action failed." />
              )}
            </Card>
          </form>
        </div>
      )}
    </section>
  );
}

function toDraft(config: ThemeConfig): ThemeDraft {
  return {
    activeTheme: config.settings.activeTheme,
    customCss: config.settings.customCss,
    customJs: config.settings.customJs,
    layout: config.settings.layout,
    palette: config.settings.palette,
  };
}

function mergeDraft(config: ThemeConfig | undefined, draft: Partial<ThemeDraft>): ThemeDraft {
  const base = config
    ? toDraft(config)
    : {
        activeTheme: "standard",
        customCss: "",
        customJs: "",
        layout: emptyLayout,
        palette: emptyPalette,
      };

  return {
    ...base,
    ...draft,
    layout: {
      ...base.layout,
      ...(draft.layout ?? {}),
    },
    palette: {
      ...base.palette,
      ...(draft.palette ?? {}),
    },
  };
}

function toLabel(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./u, (letter) => letter.toUpperCase());
}

function toPreviewStyle(palette: ThemePalette) {
  return {
    "--theme-accent": palette.accent,
    "--theme-background": palette.background,
    "--theme-foreground": palette.foreground,
    "--theme-muted": palette.muted,
    "--theme-primary": palette.primary,
    "--theme-surface": palette.surface,
  } as CSSProperties;
}

function toSwatchStyle(palette: ThemePalette) {
  return {
    "--theme-accent": palette.accent,
    "--theme-background": palette.background,
    "--theme-primary": palette.primary,
    "--theme-surface": palette.surface,
  } as CSSProperties;
}
