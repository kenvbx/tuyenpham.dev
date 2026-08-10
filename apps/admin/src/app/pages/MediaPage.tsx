import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type DragEvent, type FormEvent, useMemo, useRef, useState } from "react";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../components/toast-context";
import {
  listMediaFiles,
  listMediaFolders,
  trashMediaFile,
  uploadMediaFile,
  type AdminMediaFile,
  type AdminMediaFolder,
} from "../lib/api";

type MediaFilters = {
  folderId: string | null | undefined;
  page: number;
  perPage: number;
  search: string;
  type: "" | "document" | "image";
};

type ViewMode = "grid" | "list";

const initialFilters: MediaFilters = {
  folderId: undefined,
  page: 1,
  perPage: 24,
  search: "",
  type: "",
};

export function MediaPage() {
  const auth = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [filters, setFilters] = useState<MediaFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isDragging, setIsDragging] = useState(false);
  const token = auth.token ?? "";
  const mediaQueryKey = ["media", "files", filters];

  const foldersQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listMediaFolders(token),
    queryKey: ["media", "folders"],
  });
  const mediaQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () =>
      listMediaFiles(token, {
        folderId: filters.folderId,
        page: filters.page,
        perPage: filters.perPage,
        search: filters.search || undefined,
        type: filters.type || undefined,
      }),
    queryKey: mediaQueryKey,
  });
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        await uploadMediaFile(token, { file, folderId: filters.folderId });
      }
    },
    onSuccess: async (_data, files) => {
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      notify({
        message: `${files.length} file${files.length === 1 ? "" : "s"} uploaded.`,
        title: "Upload complete",
        variant: "success",
      });
    },
  });
  const trashMutation = useMutation({
    mutationFn: (fileId: string) => trashMediaFile(token, fileId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["media", "files"] });
      notify({ message: "Media file moved to trash.", title: "Media trashed", variant: "success" });
    },
  });

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const files = mediaQuery.data?.data ?? [];
  const pagination = mediaQuery.data?.pagination;
  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  const activeFolderName =
    filters.folderId === null
      ? "Root"
      : (folders.find((folder) => folder.id === filters.folderId)?.name ?? "All media");
  const error =
    foldersQuery.error ?? mediaQuery.error ?? uploadMutation.error ?? trashMutation.error;
  const columns: DataTableColumn<AdminMediaFile>[] = [
    {
      header: "File",
      id: "file",
      render: (file) => (
        <div className="media-file-cell">
          <MediaPreview file={file} />
          <span>
            <strong>{file.name}</strong>
            <small>{file.originalName}</small>
          </span>
        </div>
      ),
      sortable: true,
      sortValue: (file) => file.name,
    },
    {
      header: "Type",
      id: "type",
      render: (file) => file.mimeType,
      sortable: true,
      sortValue: (file) => file.mimeType,
    },
    {
      header: "Size",
      id: "size",
      render: (file) => formatSize(file.sizeBytes),
      sortable: true,
      sortValue: (file) => file.sizeBytes,
    },
    {
      align: "right",
      header: "Actions",
      id: "actions",
      render: (file) => (
        <div className="row-actions">
          <PermissionGate permission={Permission.MEDIA_DELETE}>
            <button
              aria-label={`Trash ${file.name}`}
              disabled={trashMutation.variables === file.id}
              type="button"
              onClick={() => trashMutation.mutate(file.id)}
            >
              <CmsIcon name="trash" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  function handleSearch(formData: FormData) {
    setFilters((current) => ({
      ...current,
      page: 1,
      search: String(formData.get("search") ?? ""),
      type: String(formData.get("type") ?? "") as MediaFilters["type"],
    }));
  }

  function handleUpload(files: FileList | File[]) {
    const selectedFiles = Array.from(files);

    if (selectedFiles.length > 0) {
      uploadMutation.mutate(selectedFiles);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleUpload(event.dataTransfer.files);
  }

  return (
    <section className="media-page">
      <PageHeader
        eyebrow="Content"
        title="Media library"
        actions={
          <PermissionGate permission={Permission.MEDIA_UPLOAD}>
            <Button type="button" onClick={() => fileInputRef.current?.click()}>
              <CmsIcon name="plus" />
              Upload
            </Button>
          </PermissionGate>
        }
      />

      {error && <ErrorState error={error} fallback="Unable to load media library." />}

      <div className="media-layout">
        <Card className="media-sidebar">
          <header>
            <p>Folders</p>
            <strong>{activeFolderName}</strong>
          </header>
          <FolderButton
            active={filters.folderId === undefined}
            label="All media"
            onClick={() => setFilters((current) => ({ ...current, folderId: undefined, page: 1 }))}
          />
          <FolderButton
            active={filters.folderId === null}
            label="Root"
            onClick={() => setFilters((current) => ({ ...current, folderId: null, page: 1 }))}
          />
          <div className="folder-tree">
            {folderTree.map((folder) => (
              <FolderTreeItem
                activeFolderId={filters.folderId}
                folder={folder}
                key={folder.id}
                onSelect={(folderId) =>
                  setFilters((current) => ({ ...current, folderId, page: 1 }))
                }
              />
            ))}
          </div>
        </Card>

        <div className="media-main-panel">
          <PermissionGate permission={Permission.MEDIA_UPLOAD}>
            <div
              className={isDragging ? "upload-dropzone is-dragging" : "upload-dropzone"}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                multiple
                ref={fileInputRef}
                type="file"
                onChange={(event) => {
                  if (event.currentTarget.files) {
                    handleUpload(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }
                }}
              />
              <CmsIcon name="media" />
              <span>
                <strong>{uploadMutation.isPending ? "Uploading" : "Media upload"}</strong>
                <small>{activeFolderName}</small>
              </span>
              <Button
                disabled={uploadMutation.isPending}
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Select files
              </Button>
            </div>
          </PermissionGate>

          <Card className="table-panel media-browser">
            <form
              className="toolbar"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                handleSearch(new FormData(event.currentTarget));
              }}
            >
              <label className="search-field">
                <CmsIcon name="search" />
                <Input name="search" defaultValue={filters.search} placeholder="Search media" />
              </label>
              <select name="type" defaultValue={filters.type}>
                <option value="">All types</option>
                <option value="image">Images</option>
                <option value="document">Documents</option>
              </select>
              <Button type="submit" variant="secondary">
                Filter
              </Button>
              <div className="view-toggle" aria-label="View mode">
                <button
                  aria-pressed={viewMode === "grid"}
                  type="button"
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </button>
                <button
                  aria-pressed={viewMode === "list"}
                  type="button"
                  onClick={() => setViewMode("list")}
                >
                  List
                </button>
              </div>
            </form>

            {mediaQuery.isLoading ? (
              <LoadingState description="Fetching media files." title="Loading media" />
            ) : viewMode === "list" ? (
              <DataTable
                columns={columns}
                data={files}
                emptyDescription="Upload media files to start building the library."
                emptyTitle="No media files"
                getRowKey={(file) => file.id}
                isLoading={false}
                loadingDescription="Fetching media files."
                loadingTitle="Loading media"
                pagination={
                  pagination
                    ? {
                        label: `${pagination.total} files`,
                        onPageChange: (page) => setFilters((current) => ({ ...current, page })),
                        page: pagination.page,
                        pageCount: pagination.pageCount,
                      }
                    : undefined
                }
              />
            ) : (
              <MediaGrid
                files={files}
                isTrashing={trashMutation.isPending}
                onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
                onTrash={(fileId) => trashMutation.mutate(fileId)}
                pagination={pagination}
              />
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}

type FolderNode = AdminMediaFolder & {
  children: FolderNode[];
};

function buildFolderTree(folders: AdminMediaFolder[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>();

  for (const folder of folders) {
    nodes.set(folder.id, { ...folder, children: [] });
  }

  const roots: FolderNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function FolderTreeItem({
  activeFolderId,
  folder,
  onSelect,
}: {
  activeFolderId: string | null | undefined;
  folder: FolderNode;
  onSelect: (folderId: string) => void;
}) {
  return (
    <div>
      <FolderButton
        active={activeFolderId === folder.id}
        color={folder.color}
        label={folder.name}
        onClick={() => onSelect(folder.id)}
      />
      {folder.children.length > 0 && (
        <div className="folder-tree-children">
          {folder.children.map((child) => (
            <FolderTreeItem
              activeFolderId={activeFolderId}
              folder={child}
              key={child.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderButton({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color?: string | null;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "folder-button is-active" : "folder-button"}
      type="button"
      onClick={onClick}
    >
      <span style={color ? { background: color } : undefined} />
      {label}
    </button>
  );
}

function MediaGrid({
  files,
  isTrashing,
  onPageChange,
  onTrash,
  pagination,
}: {
  files: AdminMediaFile[];
  isTrashing: boolean;
  onPageChange: (page: number) => void;
  onTrash: (fileId: string) => void;
  pagination: PaginationLike | undefined;
}) {
  if (files.length === 0) {
    return (
      <div className="page-state">
        <p className="media-empty-title">No media files</p>
        <span className="media-empty-description">
          Upload media files to start building the library.
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="media-grid">
        {files.map((file) => (
          <article className="media-card" key={file.id}>
            <MediaPreview file={file} />
            <div>
              <strong>{file.name}</strong>
              <span>{formatSize(file.sizeBytes)}</span>
            </div>
            <PermissionGate permission={Permission.MEDIA_DELETE}>
              <button
                aria-label={`Trash ${file.name}`}
                disabled={isTrashing}
                type="button"
                onClick={() => onTrash(file.id)}
              >
                <CmsIcon name="trash" />
              </button>
            </PermissionGate>
          </article>
        ))}
      </div>
      {pagination && (
        <div className="pagination">
          <span>{pagination.total} files</span>
          <div>
            <button
              disabled={pagination.page <= 1}
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <CmsIcon name="chevronLeft" />
            </button>
            <strong>
              {pagination.page} / {Math.max(pagination.pageCount, 1)}
            </strong>
            <button
              disabled={pagination.page >= pagination.pageCount}
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <CmsIcon name="chevronRight" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

type PaginationLike = {
  page: number;
  pageCount: number;
  total: number;
};

function MediaPreview({ file }: { file: AdminMediaFile }) {
  if (file.mimeType.startsWith("image/")) {
    return <img alt={file.alt ?? file.name} src={file.url} />;
  }

  return (
    <span className="media-file-icon">
      <CmsIcon name="fileText" />
    </span>
  );
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}
