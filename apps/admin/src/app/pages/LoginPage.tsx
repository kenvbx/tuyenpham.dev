import { Button, Card, Input } from "@cms/ui";
import { type FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/admin";

  if (auth.status === "authenticated") {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      setFormError(null);
      await auth.signIn(email, password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }

  return (
    <main className="login-page">
      <Card className="login-panel" aria-labelledby="login-title">
        <p>CMS Admin</p>
        <h1 id="login-title">Sign in</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <Input
              required
              type="email"
              name="email"
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <Input
              required
              type="password"
              name="password"
              minLength={8}
              placeholder="Password"
              autoComplete="current-password"
            />
          </label>
          {(formError || auth.error || !auth.isConfigured) && (
            <p className="form-alert" role="alert">
              {formError || auth.error}
            </p>
          )}
          <Button disabled={auth.status === "loading" || !auth.isConfigured} type="submit">
            {auth.status === "loading" ? "Signing in" : "Continue"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
