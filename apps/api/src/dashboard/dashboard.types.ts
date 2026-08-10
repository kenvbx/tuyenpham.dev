export type DashboardSummaryKey = "media" | "menus" | "pages" | "posts";

export type DashboardSummaryItem = {
  hint: string;
  key: DashboardSummaryKey;
  label: string;
  value: number;
};

export type DashboardRecentContentItem = {
  id: string;
  status: string;
  title: string;
  type: "page" | "post";
  updatedAt: string;
};

export type DashboardOverview = {
  recentContent: DashboardRecentContentItem[];
  summary: DashboardSummaryItem[];
};
