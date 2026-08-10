export function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <p>CMS Admin</p>
        <h1 id="login-title">Sign in</h1>
        <form>
          <label>
            Email
            <input type="email" name="email" placeholder="admin@example.com" autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" name="password" placeholder="••••••••" autoComplete="current-password" />
          </label>
          <button type="button">Continue</button>
        </form>
      </section>
    </main>
  );
}

