// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

vi.mock("../app/config/env", () => ({
  adminEnv: {
    apiUrl: "http://localhost:4000",
    supabaseAnonKey: "",
    supabaseUrl: "",
  },
  hasSupabaseConfig: () => false,
}));

describe("Admin app", () => {
  afterEach(() => {
    cleanup();
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
});
