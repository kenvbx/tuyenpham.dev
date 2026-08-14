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
  ThemeLayout,
  ThemePalette,
  ThemeSettings,
  ThemeSettingsRecord,
  ThemeUpdateInput,
} from "./theme.types.js";

export type ThemeServiceOptions = {
  settings?: SettingService;
};

const THEME_NAMESPACE = "theme";

export class ThemeService {
  private readonly settings: SettingService;

  constructor(options: ThemeServiceOptions = {}) {
    this.settings = options.settings ?? settingService;
  }

  async getConfig(): Promise<ThemeConfig> {
    const snapshot = await this.settings.getSnapshot(THEME_NAMESPACE);
    const stored = snapshot[THEME_NAMESPACE] ?? {};
    const settings = toThemeSettings(stored);
    const activeTheme = getThemeDefinition(settings.activeTheme);

    return {
      activeTheme,
      availableThemes: themeRegistry,
      settings: {
        ...settings,
        activeTheme: activeTheme.id,
      },
    };
  }

  async updateConfig(
    input: ThemeUpdateInput,
  ): Promise<{ after: ThemeConfig; before: ThemeConfig }> {
    const before = await this.getConfig();
    const nextTheme = input.activeTheme
      ? getThemeDefinition(input.activeTheme)
      : getThemeDefinition(before.settings.activeTheme);

    if (input.activeTheme && nextTheme.id !== input.activeTheme) {
      throw new HttpError("Theme is not available.", {
        code: "theme_not_available",
        details: { theme: input.activeTheme },
        statusCode: 422,
      });
    }

    const values: ThemeSettingsRecord = {
      "active-theme": nextTheme.id,
      "custom-css": input.customCss ?? before.settings.customCss,
      "custom-js": input.customJs ?? before.settings.customJs,
      layout: {
        ...before.settings.layout,
        ...(input.layout ?? {}),
      },
      palette: {
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
}

export const themeService = new ThemeService();

function toThemeSettings(values: Record<string, SettingValue>): ThemeSettings {
  const theme = getThemeDefinition(asString(values["active-theme"], fallbackTheme.id));

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

function asString(value: SettingValue | undefined, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function asRecord<TValue extends Record<string, unknown>>(value: SettingValue | undefined): TValue {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {} as TValue;
  }

  return value as TValue;
}
