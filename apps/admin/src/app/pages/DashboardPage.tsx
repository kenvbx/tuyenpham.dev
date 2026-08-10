import { Card, EmptyState } from "@cms/ui";

const summaryCards = [
  { label: "Pages", value: "0", hint: "Ready for CMS-0601" },
  { label: "Posts", value: "0", hint: "Ready for CMS-0701" },
  { label: "Media", value: "0", hint: "Ready for CMS-0501" },
  { label: "Menus", value: "0", hint: "Ready for CMS-0801" },
];

export function DashboardPage() {
  return (
    <section className="dashboard">
      <div className="dashboard-intro">
        <p>Workspace ready</p>
        <h2>CMS admin foundation</h2>
        <span>
          React, TypeScript and Vite are now wired. Feature modules will replace
          these placeholders as their tracking tasks move forward.
        </span>
      </div>

      <div className="summary-grid">
        {summaryCards.map((card) => (
          <Card key={card.label} className="summary-card">
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <span>{card.hint}</span>
          </Card>
        ))}
      </div>

      <EmptyState
        description="The first production modules will arrive through the next tracking tasks."
        title="No CMS activity yet"
      />
    </section>
  );
}
