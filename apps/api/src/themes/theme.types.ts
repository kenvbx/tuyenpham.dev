import type { SettingValue } from "../settings/setting.types.js";

export type ThemePalette = {
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  primary: string;
  surface: string;
};

export type ThemeLayout = {
  contentWidth: "compact" | "normal" | "wide";
  header: "centered" | "classic" | "minimal";
  radius: "none" | "sm" | "md";
};

export type ThemeDefinition = {
  author: string;
  description: string;
  features: string[];
  id: string;
  layout: ThemeLayout;
  name: string;
  palette: ThemePalette;
  previewImage: string | null;
  version: string;
};

export type ThemeSettings = {
  activeTheme: string;
  customCss: string;
  customJs: string;
  layout: ThemeLayout;
  palette: ThemePalette;
};

export type ThemeConfig = {
  activeTheme: ThemeDefinition;
  availableThemes: ThemeDefinition[];
  settings: ThemeSettings;
};

export type ThemeUpdateInput = {
  activeTheme?: string | undefined;
  customCss?: string | undefined;
  customJs?: string | undefined;
  layout?: Partial<ThemeLayout> | undefined;
  palette?: Partial<ThemePalette> | undefined;
  updatedBy?: string | null | undefined;
};

export type ThemeSettingsRecord = Record<string, SettingValue>;
