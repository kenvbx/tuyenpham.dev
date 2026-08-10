import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type DragEvent, type FormEvent, useMemo, useRef, useState } from "react";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { Drawer } from "../components/Drawer";
import { MediaPickerModal } from "../components/MediaPickerModal";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../components/toast-context";
import {
  listMediaFiles,
  listMediaFolders,
  trashMediaFile,
  updateMediaFile,
  uploadMediaFile,
  type AdminMediaFile,
  type AdminMediaFolder,
  type MediaUpdateInput,
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
  const [selectedFile, setSelectedFile] = useState<AdminMediaFile | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
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
  const updateMutation = useMutation({
    mutationFn: ({ fileId, input }: { fileId: string; input: MediaUpdateInput }) =>
      updateMediaFile(token, fileId, input),
    onSuccess: async (file) => {
      setSelectedFile(file);
      await queryClient.invalidateQueries({ queryKey: ["media", "files"] });
      notify({
        message: "Media metadata has been saved.",
        title: "Media saved",
        variant: "success",
      });
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
    foldersQuery.error ??
    mediaQuery.error ??
    uploadMutation.error ??
    trashMutation.error ??
    updateMutation.error;
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
          <PermissionGate permission={Permission.MEDIA_EDIT}>
            <button
              aria-label={`View ${file.name}`}
              type="button"
              onClick={() => setSelectedFile(file)}
            >
              <CmsIcon name="edit" />
            </button>
          </PermissionGate>
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
          <>
            <Button type="button" variant="secondary" onClick={() => setIsPickerOpen(true)}>
              <CmsIcon name="media" />
              Picker
            </Button>
            <PermissionGate permission={Permission.MEDIA_UPLOAD}>
              <Button type="button" onClick={() => fileInputRef.current?.click()}>
                <CmsIcon name="plus" />
                Upload
              </Button>
            </PermissionGate>
          </>
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
                onInspect={setSelectedFile}
                onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
                onTrash={(fileId) => trashMutation.mutate(fileId)}
                pagination={pagination}
              />
            )}
          </Card>
        </div>
      </div>
      <MediaDetailDrawer
        file={selectedFile}
        folders={folders}
        isSaving={updateMutation.isPending}
        onClose={() => setSelectedFile(null)}
        onSave={(fileId, input) => updateMutation.mutate({ fileId, input })}
      />
      <MediaPickerModal
        isOpen={isPickerOpen}
        token={token}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(file) => {
          setSelectedFile(file);
          notify({
            message: file.name,
            title: "Media selected",
            variant: "success",
          });
        }}
      />
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
  onInspect,
  onPageChange,
  onTrash,
  pagination,
}: {
  files: AdminMediaFile[];
  isTrashing: boolean;
  onInspect: (file: AdminMediaFile) => void;
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
            <button
              aria-label={`View ${file.name}`}
              className="media-card-edit"
              type="button"
              onClick={() => onInspect(file)}
            >
              <CmsIcon name="edit" />
            </button>
            <PermissionGate permission={Permission.MEDIA_DELETE}>
              <button
                aria-label={`Trash ${file.name}`}
                className="media-card-trash"
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

function MediaDetailDrawer({
  file,
  folders,
  isSaving,
  onClose,
  onSave,
}: {
  file: AdminMediaFile | null;
  folders: AdminMediaFolder[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (fileId: string, input: MediaUpdateInput) => void;
}) {
  return (
    <Drawer isOpen={Boolean(file)} title="Media details" onClose={onClose}>
      {file && (
        <MediaDetailForm
          file={file}
          folders={folders}
          isSaving={isSaving}
          key={file.id}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Drawer>
  );
}

function MediaDetailForm({
  file,
  folders,
  isSaving,
  onClose,
  onSave,
}: {
  file: AdminMediaFile;
  folders: AdminMediaFolder[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (fileId: string, input: MediaUpdateInput) => void;
}) {
  const [form, setForm] = useState<MediaUpdateInput>({
    alt: file.alt ?? "",
    caption: file.caption ?? "",
    folderId: file.folderId,
    name: file.name,
  });
  const isImage = file.mimeType.startsWith("image/");
  const isAltMissing = isImage && String(form.alt ?? "").trim().length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isAltMissing) {
      return;
    }

    onSave(file.id, {
      alt: form.alt ?? null,
      caption: form.caption ?? null,
      folderId: form.folderId ?? null,
      name: form.name,
    });
  }

  return (
    <form className="media-detail" onSubmit={handleSubmit}>
      <div className="media-detail-preview">
        <MediaPreview file={file} />
      </div>
      <div className={isAltMissing ? "form-alert" : "form-alert form-alert--neutral"}>
        <p>
          {isAltMissing
            ? "Image alt text is required before saving metadata."
            : "Alt text is ready for accessibility and SEO."}
        </p>
      </div>
      <label>
        <span>Name</span>
        <Input
          value={form.name ?? ""}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
      </label>
      <label>
        <span>Alt text</span>
        <Input
          value={String(form.alt ?? "")}
          onChange={(event) => setForm((current) => ({ ...current, alt: event.target.value }))}
        />
      </label>
      <label>
        <span>Caption</span>
        <textarea
          className="cms-textarea"
          value={String(form.caption ?? "")}
          onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))}
        />
      </label>
      <label>
        <span>Folder</span>
        <select
          value={form.folderId ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              folderId: event.target.value || null,
            }))
          }
        >
          <option value="">Root</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </label>
      <dl>
        <div>
          <dt>Type</dt>
          <dd>{file.mimeType}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatSize(file.sizeBytes)}</dd>
        </div>
        <div>
          <dt>Dimensions</dt>
          <dd>{file.width && file.height ? `${file.width} x ${file.height}` : "n/a"}</dd>
        </div>
      </dl>
      <div className="drawer-actions">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={isSaving || isAltMissing} type="submit">
          {isSaving ? "Saving" : "Save"}
        </Button>
      </div>
    </form>
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
