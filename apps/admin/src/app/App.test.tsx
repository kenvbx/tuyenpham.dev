// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuthContextValue } from "./auth/auth-context";
import { App } from "./App";

const mockAuth: AuthContextValue = {
  currentUser: null,
  error: "Missing Supabase admin configuration.",
  hasPermission: () => false,
  isConfigured: false,
  refreshCurrentUser: vi.fn(async () => undefined),
  session: null,
  signIn: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  status: "unauthenticated",
  token: null,
};

vi.mock("../app/auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("../app/auth/auth-context", async () => {
  const actual = await vi.importActual("../app/auth/auth-context");

  return {
    ...actual,
    useAuth: () => mockAuth,
  };
});

vi.mock("../app/config/env", () => ({
  adminEnv: {
    apiUrl: "http://localhost:4000",
    supabaseAnonKey: "",
    supabaseUrl: "",
  },
  hasSupabaseConfig: () => false,
}));

vi.mock("../app/lib/api", async () => {
  const actual = await vi.importActual("../app/lib/api");

  return {
    ...actual,
    getDashboardOverview: vi.fn(async () => ({
      recentContent: [
        {
          id: "10000000-0000-4000-8000-000000000001",
          status: "draft",
          title: "About",
          type: "page",
          updatedAt: "2026-08-10T00:00:00.000Z",
        },
      ],
      summary: [
        {
          hint: "Published and draft pages",
          key: "pages",
          label: "Pages",
          value: 3,
        },
      ],
    })),
  };
});

describe("Admin app", () => {
  afterEach(() => {
    cleanup();
    Object.assign(mockAuth, {
      currentUser: null,
      error: "Missing Supabase admin configuration.",
      hasPermission: () => false,
      isConfigured: false,
      session: null,
      status: "unauthenticated",
      token: null,
    });
  });

  it("renders the login route", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("redirects protected routes to login without a session", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("smoke renders the authenticated admin shell and dashboard", async () => {
    Object.assign(mockAuth, {
      currentUser: {
        permissions: ["pages.index"],
        profile: {
          avatarId: null,
          displayName: "Admin",
          email: "admin@example.com",
          firstName: "Admin",
          id: "10000000-0000-4000-8000-000000000001",
          lastLoginAt: null,
          lastName: null,
          status: "active",
        },
        roles: [
          {
            description: null,
            id: "10000000-0000-4000-8000-000000000002",
            isDefault: false,
            isSystem: true,
            name: "Super Admin",
            slug: "super-admin",
          },
        ],
      },
      error: null,
      hasPermission: () => true,
      isConfigured: true,
      session: { access_token: "token" },
      status: "authenticated",
      token: "token",
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("complementary", { name: "Admin navigation" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "CMS dashboard" })).toBeInTheDocument();
    queryClient.clear();
  });
});
