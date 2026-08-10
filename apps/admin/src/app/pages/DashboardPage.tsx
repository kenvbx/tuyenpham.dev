import { Card, CmsIcon } from "@cms/ui";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/auth-context";
import { EmptyPageState, ErrorState, LoadingState } from "../components/PageState";
import { getDashboardOverview } from "../lib/api";

export function DashboardPage() {
  const auth = useAuth();
  const token = auth.token ?? "";
  const dashboardQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getDashboardOverview(token),
    queryKey: ["dashboard", "overview"],
  });
  const overview = dashboardQuery.data;
  const hasRecentContent = Boolean(overview?.recentContent.length);

  return (
    <section className="dashboard">
      <div className="dashboard-intro">
        <p>Overview</p>
        <h2>CMS dashboard</h2>
        <span>Track content volume and the latest page or post updates from one place.</span>
      </div>

      {dashboardQuery.isLoading && (
        <LoadingState description="Fetching CMS metrics." title="Loading dashboard" />
      )}

      {dashboardQuery.error && (
        <ErrorState error={dashboardQuery.error} fallback="Unable to load dashboard overview." />
      )}

      {overview && (
        <>
          <div className="summary-grid">
            {overview.summary.map((card) => (
              <Card key={card.key} className="summary-card">
                <p>{card.label}</p>
                <strong>{card.value.toLocaleString()}</strong>
                <span>{card.hint}</span>
              </Card>
            ))}
          </div>

          <Card className="dashboard-panel">
            <header>
              <div>
                <p>Recent content</p>
                <h3>Latest updates</h3>
              </div>
            </header>

            {hasRecentContent ? (
              <div className="recent-content-list">
                {overview.recentContent.map((item) => (
                  <article key={`${item.type}-${item.id}`} className="recent-content-item">
                    <span className="recent-content-icon">
                      <CmsIcon name={item.type === "page" ? "fileText" : "article"} />
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {capitalize(item.type)} / {item.status} / {formatDate(item.updatedAt)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyPageState
                description="Pages and posts will appear here after the first content records are created."
                title="No recent content"
              />
            )}
          </Card>
        </>
      )}
    </section>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
