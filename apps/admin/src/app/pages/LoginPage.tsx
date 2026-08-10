import { Button, Card, Input } from "@cms/ui";

export function LoginPage() {
  return (
    <main className="login-page">
      <Card className="login-panel" aria-labelledby="login-title">
        <p>CMS Admin</p>
        <h1 id="login-title">Sign in</h1>
        <form>
          <label>
            Email
            <Input type="email" name="email" placeholder="admin@example.com" autoComplete="email" />
          </label>
          <label>
            Password
            <Input
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>
          <Button>Continue</Button>
        </form>
      </Card>
    </main>
  );
}
