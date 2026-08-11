import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { Drawer } from "../components/Drawer";
import { ErrorState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../components/toast-context";
import {
  createBackupExport,
  createImportPlan,
  getAuditLog,
  listAdminRevisions,
  listAuditLogs,
  restoreAdminRevision,
  type AdminRevision,
  type AuditLogEntry,
  type BackupExport,
  type ImportPlan,
} from "../lib/api";

type AuditTab = "logs" | "operations" | "revisions";

type AuditFilters = {
  action: string;
  entityType: string;
  page: number;
  search: string;
};

type RevisionFilters = {
  entityId: string;
  entityType: "" | "page" | "post" | "setting";
  page: number;
};

const perPage = 20;

export function AuditPage() {
  const auth = useAuth();
  const token = auth.token ?? "";
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AuditTab>("logs");
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({
    action: "",
    entityType: "",
    page: 1,
    search: "",
  });
  const [revisionFilters, setRevisionFilters] = useState<RevisionFilters>({
    entityId: "",
    entityType: "",
    page: 1,
  });
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<string | null>(null);
  const [backup, setBackup] = useState<BackupExport | null>(null);
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);

  const auditLogsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () =>
      listAuditLogs(token, {
        action: auditFilters.action || undefined,
        entityType: auditFilters.entityType || undefined,
        page: auditFilters.page,
        perPage,
        search: auditFilters.search || undefined,
      }),
    queryKey: ["audit-logs", auditFilters],
  });
  const auditLogDetailQuery = useQuery({
    enabled: Boolean(token && selectedAuditLogId),
    queryFn: () => getAuditLog(token, selectedAuditLogId ?? ""),
    queryKey: ["audit-logs", selectedAuditLogId],
  });
  const revisionsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () =>
      listAdminRevisions(token, {
        entityId: revisionFilters.entityId || undefined,
        entityType: revisionFilters.entityType || undefined,
        page: revisionFilters.page,
        perPage,
      }),
    queryKey: ["admin-revisions", revisionFilters],
  });
  const restoreRevisionMutation = useMutation({
    mutationFn: (revisionId: string) => restoreAdminRevision(token, revisionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-revisions"] });
      notify({
        message: "Revision has been restored.",
        title: "Revision restored",
        variant: "success",
      });
    },
  });
  const backupMutation = useMutation({
    mutationFn: () => createBackupExport(token),
    onSuccess: (result) => {
      setBackup(result);
      notify({
        message: "Backup export has been prepared.",
        title: "Export ready",
        variant: "success",
      });
    },
  });
  const importPlanMutation = useMutation({
    mutationFn: (input: {
      format: "csv" | "json" | "markdown";
      items?: unknown[];
      sourceName?: string;
    }) => createImportPlan(token, input),
    onSuccess: (result) => {
      setImportPlan(result);
      notify({
        message: "Import plan has been validated.",
        title: "Import plan ready",
        variant: "success",
      });
    },
  });
  const auditColumns: DataTableColumn<AuditLogEntry>[] = [
    {
      header: "Action",
      id: "action",
      render: (log) => (
        <>
          <strong>{log.action}</strong>
          <span>{formatDate(log.createdAt)}</span>
        </>
      ),
      sortable: true,
      sortValue: (log) => log.action,
    },
    {
      header: "Entity",
      id: "entity",
      render: (log) => (
        <>
          <strong>{log.entityType}</strong>
          <span>{log.entityId ?? "system"}</span>
        </>
      ),
    },
    {
      header: "Actor",
      id: "actor",
      render: (log) => log.actorId ?? "system",
    },
    {
      align: "right",
      header: "Actions",
      id: "actions",
      render: (log) => (
        <div className="row-actions">
          <button
            aria-label={`View ${log.action}`}
            type="button"
            onClick={() => setSelectedAuditLogId(log.id)}
          >
            <CmsIcon name="search" />
          </button>
        </div>
      ),
    },
  ];
  const revisionColumns: DataTableColumn<AdminRevision>[] = [
    {
      header: "Revision",
      id: "revision",
      render: (revision) => (
        <>
          <strong>Revision {revision.revisionNumber}</strong>
          <span>{revision.title ?? snapshotTitle(revision.snapshot)}</span>
        </>
      ),
      sortable: true,
      sortValue: (revision) => revision.revisionNumber,
    },
    {
      header: "Entity",
      id: "entity",
      render: (revision) => (
        <>
          <strong>{revision.entityType}</strong>
          <span>{revision.entityId}</span>
        </>
      ),
    },
    {
      header: "Created",
      id: "created",
      render: (revision) => formatDate(revision.createdAt),
      sortable: true,
      sortValue: (revision) => revision.createdAt,
    },
    {
      align: "right",
      header: "Actions",
      id: "actions",
      render: (revision) => (
        <PermissionGate permission={restorePermissionFor(revision.entityType)}>
          <Button
            disabled={restoreRevisionMutation.isPending || revision.entityType === "setting"}
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => restoreRevisionMutation.mutate(revision.id)}
          >
            Restore
          </Button>
        </PermissionGate>
      ),
    },
  ];
  const error =
    auditLogsQuery.error ??
    revisionsQuery.error ??
    auditLogDetailQuery.error ??
    restoreRevisionMutation.error ??
    backupMutation.error ??
    importPlanMutation.error;

  function handleAuditSearch(formData: FormData) {
    setAuditFilters({
      action: String(formData.get("action") ?? ""),
      entityType: String(formData.get("entityType") ?? ""),
      page: 1,
      search: String(formData.get("search") ?? ""),
    });
  }

  function handleRevisionSearch(formData: FormData) {
    setRevisionFilters({
      entityId: String(formData.get("entityId") ?? ""),
      entityType: String(formData.get("entityType") ?? "") as RevisionFilters["entityType"],
      page: 1,
    });
  }

  return (
    <section className="audit-page">
      <PageHeader eyebrow="System" title="Audit and recovery" />
      {error && <ErrorState error={error} fallback="Unable to load audit data." />}

      <Card className="audit-tabs" aria-label="Audit sections">
        {[
          ["logs", "Audit logs"],
          ["revisions", "Revisions"],
          ["operations", "Operations"],
        ].map(([tab, label]) => (
          <button
            key={tab}
            aria-pressed={activeTab === tab}
            className={activeTab === tab ? "is-active" : undefined}
            type="button"
            onClick={() => setActiveTab(tab as AuditTab)}
          >
            {label}
          </button>
        ))}
      </Card>

      {activeTab === "logs" && (
        <Card className="table-panel">
          <DataTable
            columns={auditColumns}
            data={auditLogsQuery.data?.data ?? []}
            emptyDescription="Audit events will appear after privileged actions run."
            emptyTitle="No audit logs found"
            filters={
              <>
                <Input name="action" placeholder="Action" defaultValue={auditFilters.action} />
                <Input
                  name="entityType"
                  placeholder="Entity"
                  defaultValue={auditFilters.entityType}
                />
              </>
            }
            getRowKey={(log) => log.id}
            isLoading={auditLogsQuery.isLoading}
            loadingDescription="Fetching audit events."
            loadingTitle="Loading audit logs"
            onSearch={handleAuditSearch}
            pagination={
              auditLogsQuery.data
                ? {
                    label: `${auditLogsQuery.data.pagination.total} audit logs`,
                    onPageChange: (page) => setAuditFilters((current) => ({ ...current, page })),
                    page: auditLogsQuery.data.pagination.page,
                    pageCount: auditLogsQuery.data.pagination.pageCount,
                  }
                : undefined
            }
            searchDefaultValue={auditFilters.search}
            searchPlaceholder="Search audit logs"
          />
        </Card>
      )}

      {activeTab === "revisions" && (
        <Card className="table-panel">
          <DataTable
            columns={revisionColumns}
            data={revisionsQuery.data?.data ?? []}
            emptyDescription="Content revisions will appear after page or post edits."
            emptyTitle="No revisions found"
            filters={
              <>
                <select name="entityType" defaultValue={revisionFilters.entityType}>
                  <option value="">All entities</option>
                  <option value="page">Pages</option>
                  <option value="post">Posts</option>
                  <option value="setting">Settings</option>
                </select>
                <Input
                  name="entityId"
                  placeholder="Entity ID"
                  defaultValue={revisionFilters.entityId}
                />
              </>
            }
            getRowKey={(revision) => revision.id}
            isLoading={revisionsQuery.isLoading}
            loadingDescription="Fetching revisions."
            loadingTitle="Loading revisions"
            onSearch={handleRevisionSearch}
            pagination={
              revisionsQuery.data
                ? {
                    label: `${revisionsQuery.data.pagination.total} revisions`,
                    onPageChange: (page) => setRevisionFilters((current) => ({ ...current, page })),
                    page: revisionsQuery.data.pagination.page,
                    pageCount: revisionsQuery.data.pagination.pageCount,
                  }
                : undefined
            }
          />
        </Card>
      )}

      {activeTab === "operations" && (
        <OperationsPanel
          backup={backup}
          importPlan={importPlan}
          isExporting={backupMutation.isPending}
          isPlanningImport={importPlanMutation.isPending}
          onExport={() => backupMutation.mutate()}
          onPlanImport={(input) => importPlanMutation.mutate(input)}
        />
      )}

      <AuditLogDrawer
        log={auditLogDetailQuery.data ?? null}
        isLoading={auditLogDetailQuery.isFetching}
        onClose={() => setSelectedAuditLogId(null)}
      />
    </section>
  );
}

type OperationsPanelProps = {
  backup: BackupExport | null;
  importPlan: ImportPlan | null;
  isExporting: boolean;
  isPlanningImport: boolean;
  onExport: () => void;
  onPlanImport: (input: {
    format: "csv" | "json" | "markdown";
    items?: unknown[];
    sourceName?: string;
  }) => void;
};

function OperationsPanel({
  backup,
  importPlan,
  isExporting,
  isPlanningImport,
  onExport,
  onPlanImport,
}: OperationsPanelProps) {
  const [format, setFormat] = useState<"csv" | "json" | "markdown">("json");
  const [sourceName, setSourceName] = useState("");
  const [itemCount, setItemCount] = useState(1);

  function submitImportPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: {
      format: "csv" | "json" | "markdown";
      items: unknown[];
      sourceName?: string;
    } = {
      format,
      items: Array.from({ length: itemCount }, (_item, index) => ({ index })),
    };

    if (sourceName) {
      input.sourceName = sourceName;
    }

    onPlanImport(input);
  }

  return (
    <div className="audit-operations">
      <Card className="form-panel">
        <header>
          <h3>Backup export</h3>
        </header>
        <Button disabled={isExporting} type="button" onClick={onExport}>
          <CmsIcon name="settings" />
          {isExporting ? "Exporting" : "Create export"}
        </Button>
        {backup && (
          <div className="operation-result">
            <strong>{backup.format}</strong>
            <span>{formatDate(backup.generatedAt)}</span>
            <pre>{JSON.stringify(tableCounts(backup), null, 2)}</pre>
          </div>
        )}
      </Card>

      <Card className="form-panel">
        <header>
          <h3>Import plan</h3>
        </header>
        <form className="operation-form" onSubmit={submitImportPlan}>
          <label className="cms-field">
            <span>Format</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as typeof format)}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="markdown">Markdown</option>
            </select>
          </label>
          <label className="cms-field">
            <span>Source name</span>
            <Input value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
          </label>
          <label className="cms-field">
            <span>Items</span>
            <Input
              min={0}
              type="number"
              value={itemCount}
              onChange={(event) => setItemCount(Number(event.target.value))}
            />
          </label>
          <Button disabled={isPlanningImport} type="submit">
            {isPlanningImport ? "Planning" : "Validate import"}
          </Button>
        </form>
        {importPlan && (
          <div className="operation-result">
            <strong>{importPlan.accepted ? "Accepted" : "Needs review"}</strong>
            <span>{importPlan.estimatedItems} items</span>
            <pre>{JSON.stringify(importPlan, null, 2)}</pre>
          </div>
        )}
      </Card>
    </div>
  );
}

function AuditLogDrawer({
  isLoading,
  log,
  onClose,
}: {
  isLoading: boolean;
  log: AuditLogEntry | null;
  onClose: () => void;
}) {
  return (
    <Drawer isOpen={Boolean(log || isLoading)} title="Audit log detail" onClose={onClose}>
      {isLoading ? (
        <p className="drawer-loading">Loading audit log.</p>
      ) : log ? (
        <div className="audit-detail">
          <dl>
            <div>
              <dt>Action</dt>
              <dd>{log.action}</dd>
            </div>
            <div>
              <dt>Entity</dt>
              <dd>
                {log.entityType} / {log.entityId ?? "system"}
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(log.createdAt)}</dd>
            </div>
          </dl>
          <JsonBlock title="Before" value={log.beforeData} />
          <JsonBlock title="After" value={log.afterData} />
          <JsonBlock title="Metadata" value={log.metadata} />
        </div>
      ) : null}
    </Drawer>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <section>
      <h3>{title}</h3>
      <pre>{JSON.stringify(value ?? null, null, 2)}</pre>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function snapshotTitle(snapshot: Record<string, unknown>) {
  return typeof snapshot["title"] === "string" ? snapshot["title"] : "Untitled snapshot";
}

function restorePermissionFor(entityType: AdminRevision["entityType"]) {
  if (entityType === "page") {
    return Permission.PAGES_EDIT;
  }

  if (entityType === "post") {
    return Permission.BLOG_POSTS_EDIT;
  }

  return Permission.SETTINGS_GENERAL;
}

function tableCounts(backup: BackupExport) {
  return Object.fromEntries(
    Object.entries(backup.tables).map(([table, rows]) => [table, rows.length]),
  );
}
