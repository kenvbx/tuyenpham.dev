import AdmZip from "adm-zip";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { HttpError } from "../http/http-error.js";
import { settingService, type SettingService } from "../settings/setting.service.js";
import type { SettingValue } from "../settings/setting.types.js";
import {
  defaultThemeLayout,
  defaultThemePalette,
  fallbackTheme,
  getThemeDefinition,
  themeRegistry,
} from "./theme.registry.js";
import type {
  ThemeConfig,
  ThemeDefinition,
  ThemeInstallInput,
  ThemeLayout,
  ThemePalette,
  ThemeSettings,
  ThemeSettingsRecord,
  ThemeUpdateInput,
} from "./theme.types.js";

export type ThemeServiceOptions = {
  settings?: SettingService;
  storagePath?: string | undefined;
};

const THEME_NAMESPACE = "theme";
const THEME_MANIFEST = "theme.json";
const THEME_STORAGE_PATH =
  process.env["THEME_STORAGE_PATH"] ?? path.resolve(process.cwd(), "../../storage/themes");
const THEME_PUBLIC_BASE_URL = "/api/public/themes";

const themeManifestSchema = z.object({
  author: z.string().trim().min(1).max(120).default("Unknown"),
  description: z.string().trim().max(500).default(""),
  features: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  layout: z
    .object({
      contentWidth: z.enum(["compact", "normal", "wide"]).default("normal"),
      header: z.enum(["centered", "classic", "minimal"]).default("classic"),
      radius: z.enum(["none", "sm", "md"]).default("sm"),
    })
    .default(defaultThemeLayout),
  name: z.string().trim().min(1).max(120),
  palette: z
    .object({
      accent: colorSchema(defaultThemePalette.accent),
      background: colorSchema(defaultThemePalette.background),
      foreground: colorSchema(defaultThemePalette.foreground),
      muted: colorSchema(defaultThemePalette.muted),
      primary: colorSchema(defaultThemePalette.primary),
      surface: colorSchema(defaultThemePalette.surface),
    })
    .default(defaultThemePalette),
  previewImage: z.string().trim().min(1).max(240).nullable().default(null),
  version: z.string().trim().min(1).max(40).default("1.0.0"),
});

export class ThemeService {
  private readonly settings: SettingService;
  private readonly storagePath: string;

  constructor(options: ThemeServiceOptions = {}) {
    this.settings = options.settings ?? settingService;
    this.storagePath = options.storagePath ?? THEME_STORAGE_PATH;
  }

  getStoragePath() {
    return this.storagePath;
  }

  async getConfig(): Promise<ThemeConfig> {
    const snapshot = await this.settings.getSnapshot(THEME_NAMESPACE);
    const stored = snapshot[THEME_NAMESPACE] ?? {};
    const installedThemes = await this.listInstalledThemes();
    const settings = toThemeSettings(stored, installedThemes);
    const activeTheme =
      installedThemes.find((theme) => theme.id === settings.activeTheme) ?? fallbackTheme;

    return {
      activeTheme,
      installedThemes,
      settings: {
        ...settings,
        activeTheme: activeTheme.id,
      },
    };
  }

  async installTheme(
    input: ThemeInstallInput,
  ): Promise<{ after: ThemeConfig; before: ThemeConfig; installedTheme: ThemeDefinition }> {
    if (!input.originalName.toLowerCase().endsWith(".zip")) {
      throw new HttpError("Theme package must be a .zip file.", {
        code: "theme_package_invalid_type",
        statusCode: 422,
      });
    }

    const before = await this.getConfig();
    const zip = new AdmZip(input.buffer);
    const entries = zip.getEntries();

    validateZipEntries(entries.map((entry) => entry.entryName));

    const manifestEntry = findManifestEntry(entries);
    const manifest = themeManifestSchema.parse(
      JSON.parse(manifestEntry.getData().toString("utf8")) as unknown,
    );

    if (themeRegistry.some((theme) => theme.id === manifest.id)) {
      throw new HttpError("Built-in themes cannot be overwritten.", {
        code: "theme_builtin_overwrite_denied",
        details: { theme: manifest.id },
        statusCode: 422,
      });
    }

    const themePath = this.getThemePath(manifest.id);
    await rm(themePath, { force: true, recursive: true });
    await mkdir(themePath, { recursive: true });

    const rootPrefix = manifestEntry.entryName.slice(0, -THEME_MANIFEST.length);

    for (const entry of entries) {
      if (entry.isDirectory) {
        continue;
      }

      const relativePath = normalizeThemeEntryPath(entry.entryName, rootPrefix);

      if (!relativePath) {
        continue;
      }

      const outputPath = path.join(themePath, relativePath);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, entry.getData());
    }

    const installedTheme = await this.getInstalledTheme(manifest.id);

    if (!installedTheme) {
      throw new HttpError("Theme package could not be installed.", {
        code: "theme_install_failed",
        statusCode: 500,
      });
    }

    return {
      after: await this.getConfig(),
      before,
      installedTheme,
    };
  }

  async activateTheme(
    themeId: string,
    updatedBy?: string | null | undefined,
  ): Promise<{ after: ThemeConfig; before: ThemeConfig }> {
    return this.updateConfig({ activeTheme: themeId, updatedBy });
  }

  async deleteTheme(
    themeId: string,
    updatedBy?: string | null | undefined,
  ): Promise<{ after: ThemeConfig; before: ThemeConfig; deletedTheme: ThemeDefinition }> {
    if (themeRegistry.some((theme) => theme.id === themeId)) {
      throw new HttpError("Built-in themes cannot be deleted.", {
        code: "theme_builtin_delete_denied",
        details: { theme: themeId },
        statusCode: 422,
      });
    }

    const before = await this.getConfig();
    const deletedTheme = before.installedThemes.find((theme) => theme.id === themeId);

    if (!deletedTheme) {
      throw new HttpError("Theme was not found.", {
        code: "theme_not_found",
        details: { theme: themeId },
        statusCode: 404,
      });
    }

    await rm(this.getThemePath(themeId), { force: true, recursive: true });

    if (before.settings.activeTheme === themeId) {
      await this.updateConfig({ activeTheme: fallbackTheme.id, updatedBy });
    }

    return {
      after: await this.getConfig(),
      before,
      deletedTheme,
    };
  }

  async updateConfig(
    input: ThemeUpdateInput,
  ): Promise<{ after: ThemeConfig; before: ThemeConfig }> {
    const before = await this.getConfig();
    const installedThemes = await this.listInstalledThemes();
    const nextTheme = input.activeTheme
      ? installedThemes.find((theme) => theme.id === input.activeTheme)
      : installedThemes.find((theme) => theme.id === before.settings.activeTheme);

    if (!nextTheme) {
      throw new HttpError("Theme is not installed.", {
        code: "theme_not_installed",
        details: { theme: input.activeTheme },
        statusCode: 422,
      });
    }

    const values: ThemeSettingsRecord = {
      "active-theme": nextTheme.id,
      "custom-css": input.customCss ?? before.settings.customCss,
      "custom-js": input.customJs ?? before.settings.customJs,
      layout: {
        ...nextTheme.layout,
        ...before.settings.layout,
        ...(input.layout ?? {}),
      },
      palette: {
        ...nextTheme.palette,
        ...before.settings.palette,
        ...(input.palette ?? {}),
      },
    };

    await this.settings.updateNamespace({
      namespace: THEME_NAMESPACE,
      updatedBy: input.updatedBy,
      values,
    });

    return {
      after: await this.getConfig(),
      before,
    };
  }

  private async getInstalledTheme(themeId: string) {
    return (await this.listInstalledThemes()).find((theme) => theme.id === themeId) ?? null;
  }

  private getThemePath(themeId: string) {
    return path.join(this.storagePath, themeId);
  }

  private async listInstalledThemes(): Promise<ThemeDefinition[]> {
    await mkdir(this.storagePath, { recursive: true });

    const uploadedThemes = await Promise.all(
      (await listThemeDirectories(this.storagePath)).map((themeId) =>
        this.readUploadedTheme(themeId),
      ),
    );

    return [...themeRegistry, ...uploadedThemes.filter((theme) => theme !== null)];
  }

  private async readUploadedTheme(themeId: string): Promise<ThemeDefinition | null> {
    try {
      const manifestPath = path.join(this.storagePath, themeId, THEME_MANIFEST);
      await access(manifestPath, fsConstants.R_OK);
      const manifest = themeManifestSchema.parse(
        JSON.parse(await readFile(manifestPath, "utf8")) as unknown,
      );

      if (manifest.id !== themeId) {
        return null;
      }

      return {
        ...manifest,
        assetBaseUrl: `${THEME_PUBLIC_BASE_URL}/${manifest.id}`,
        installedAt: null,
        previewImage: manifest.previewImage
          ? `${THEME_PUBLIC_BASE_URL}/${manifest.id}/${manifest.previewImage}`
          : null,
        source: "uploaded",
      };
    } catch {
      return null;
    }
  }
}

export const themeService = new ThemeService();

function toThemeSettings(
  values: Record<string, SettingValue>,
  installedThemes: ThemeDefinition[],
): ThemeSettings {
  const theme =
    installedThemes.find(
      (item) => item.id === asString(values["active-theme"], fallbackTheme.id),
    ) ?? getThemeDefinition(fallbackTheme.id);

  return {
    activeTheme: theme.id,
    customCss: asString(values["custom-css"], ""),
    customJs: asString(values["custom-js"], ""),
    layout: {
      ...defaultThemeLayout,
      ...theme.layout,
      ...asRecord<Partial<ThemeLayout>>(values["layout"]),
    },
    palette: {
      ...defaultThemePalette,
      ...theme.palette,
      ...asRecord<Partial<ThemePalette>>(values["palette"]),
    },
  };
}

async function listThemeDirectories(storagePath: string) {
  try {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(storagePath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.name))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function colorSchema(defaultValue: string) {
  return z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/iu)
    .default(defaultValue);
}

function findManifestEntry(entries: AdmZip.IZipEntry[]) {
  const manifestEntry = entries.find(
    (entry) => !entry.isDirectory && entry.entryName.endsWith(THEME_MANIFEST),
  );

  if (!manifestEntry) {
    throw new HttpError("Theme package must include theme.json.", {
      code: "theme_manifest_missing",
      statusCode: 422,
    });
  }

  return manifestEntry;
}

function normalizeThemeEntryPath(entryName: string, rootPrefix: string) {
  const normalized = entryName.replaceAll("\\", "/");
  const relative =
    rootPrefix && normalized.startsWith(rootPrefix)
      ? normalized.slice(rootPrefix.length)
      : normalized;

  return relative.replace(/^\/+/u, "");
}

function validateZipEntries(entryNames: string[]) {
  for (const entryName of entryNames) {
    const normalized = entryName.replaceAll("\\", "/");

    if (
      normalized.startsWith("/") ||
      normalized.includes("../") ||
      normalized === ".." ||
      normalized.includes("\0")
    ) {
      throw new HttpError("Theme package contains unsafe paths.", {
        code: "theme_package_unsafe_path",
        statusCode: 422,
      });
    }
  }
}

function asString(value: SettingValue | undefined, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function asRecord<TValue extends Record<string, unknown>>(value: SettingValue | undefined): TValue {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {} as TValue;
  }

  return value as TValue;
}
