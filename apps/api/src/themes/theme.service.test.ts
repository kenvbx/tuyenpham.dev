import AdmZip from "adm-zip";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SettingService } from "../settings/setting.service.js";
import { ThemeService } from "./theme.service.js";

let storagePath: string;

const settingsSnapshot: Record<string, Record<string, unknown>> = {};
const settings = {
  getSnapshot: vi.fn(async (namespace?: string) => {
    if (!namespace) {
      return settingsSnapshot;
    }

    return settingsSnapshot[namespace] ? { [namespace]: settingsSnapshot[namespace] } : {};
  }),
  updateNamespace: vi.fn(async ({ namespace, values }) => {
    settingsSnapshot[namespace] = {
      ...(settingsSnapshot[namespace] ?? {}),
      ...values,
    };

    return {
      after: { [namespace]: settingsSnapshot[namespace] },
      before: {},
    };
  }),
} as unknown as SettingService;

beforeEach(async () => {
  storagePath = await mkdtemp(path.join(os.tmpdir(), "cms-themes-"));
  settingsSnapshot.theme = {};
  vi.clearAllMocks();
});

afterEach(async () => {
  await rm(storagePath, { force: true, recursive: true });
});

describe("theme service", () => {
  it("lists built-in themes before any package is installed", async () => {
    const service = new ThemeService({ settings, storagePath });

    const config = await service.getConfig();

    expect(config.activeTheme.id).toBe("standard");
    expect(config.installedThemes.map((theme) => theme.id)).toEqual([
      "standard",
      "studio",
      "journal",
    ]);
  });

  it("installs theme packages from zip manifests and can activate them", async () => {
    const service = new ThemeService({ settings, storagePath });
    const archive = createThemeArchive();

    const installed = await service.installTheme({
      buffer: archive.toBuffer(),
      originalName: "portfolio.zip",
      uploadedBy: "user-1",
    });
    const manifest = JSON.parse(
      await readFile(path.join(storagePath, "portfolio", "theme.json"), "utf8"),
    ) as { id: string };

    expect(manifest.id).toBe("portfolio");
    expect(installed.installedTheme).toMatchObject({
      assetBaseUrl: "/api/public/themes/portfolio",
      id: "portfolio",
      source: "uploaded",
    });

    const activated = await service.activateTheme("portfolio", "user-1");

    expect(activated.after.activeTheme.id).toBe("portfolio");
    expect(settings.updateNamespace).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: "theme",
        updatedBy: "user-1",
      }),
    );
  });
});

function createThemeArchive() {
  const archive = new AdmZip();
  archive.addFile(
    "portfolio/theme.json",
    Buffer.from(
      JSON.stringify({
        author: "Acme",
        description: "A portfolio theme.",
        features: ["Portfolio", "Blog"],
        id: "portfolio",
        layout: { contentWidth: "wide", header: "minimal", radius: "md" },
        name: "Portfolio",
        palette: {
          accent: "#f59e0b",
          background: "#f8fafc",
          foreground: "#111827",
          muted: "#64748b",
          primary: "#2563eb",
          surface: "#ffffff",
        },
        previewImage: "screenshot.png",
        version: "1.0.0",
      }),
    ),
  );
  archive.addFile("portfolio/screenshot.png", Buffer.from("image"));

  return archive;
}
