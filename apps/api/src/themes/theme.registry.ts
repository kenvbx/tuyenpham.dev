import type { ThemeDefinition, ThemeLayout, ThemePalette } from "./theme.types.js";

export const defaultThemePalette: ThemePalette = {
  accent: "#f59e0b",
  background: "#f8fafc",
  foreground: "#111827",
  muted: "#64748b",
  primary: "#2563eb",
  surface: "#ffffff",
};

export const defaultThemeLayout: ThemeLayout = {
  contentWidth: "normal",
  header: "classic",
  radius: "sm",
};

export const themeRegistry: ThemeDefinition[] = [
  {
    author: "Tuyen Pham CMS",
    description: "Balanced editorial layout for pages, posts, menus and media-rich sections.",
    features: ["Page builder ready", "Blog archive", "Header and footer menus", "SEO metadata"],
    id: "standard",
    layout: defaultThemeLayout,
    name: "Standard",
    palette: defaultThemePalette,
    previewImage: null,
    version: "1.0.0",
  },
  {
    author: "Tuyen Pham CMS",
    description: "Quiet professional preset for portfolio, services and personal brand websites.",
    features: ["Compact header", "Portfolio sections", "Contact-ready layout", "High contrast"],
    id: "studio",
    layout: {
      contentWidth: "wide",
      header: "minimal",
      radius: "md",
    },
    name: "Studio",
    palette: {
      accent: "#14b8a6",
      background: "#f7f7f2",
      foreground: "#1f2937",
      muted: "#6b7280",
      primary: "#0f766e",
      surface: "#ffffff",
    },
    previewImage: null,
    version: "1.0.0",
  },
  {
    author: "Tuyen Pham CMS",
    description: "Content-first preset for documentation, news and long-form publishing.",
    features: ["Readable article width", "Category navigation", "Soft surfaces", "Archive pages"],
    id: "journal",
    layout: {
      contentWidth: "compact",
      header: "centered",
      radius: "none",
    },
    name: "Journal",
    palette: {
      accent: "#dc2626",
      background: "#fbfaf8",
      foreground: "#18181b",
      muted: "#71717a",
      primary: "#7c2d12",
      surface: "#ffffff",
    },
    previewImage: null,
    version: "1.0.0",
  },
];

export const fallbackTheme = themeRegistry[0] as ThemeDefinition;

export function getThemeDefinition(themeId: string | null | undefined) {
  return themeRegistry.find((theme) => theme.id === themeId) ?? fallbackTheme;
}
