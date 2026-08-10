import { Button, CmsIcon, Input } from "@cms/ui";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { listMediaFiles, type AdminMediaFile } from "../lib/api";
import { Modal } from "./Modal";
import { EmptyPageState, ErrorState, LoadingState } from "./PageState";

type MediaPickerModalProps = {
  acceptedType?: "document" | "image";
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: AdminMediaFile) => void;
  token: string;
};

export function MediaPickerModal({
  acceptedType,
  isOpen,
  onClose,
  onSelect,
  token,
}: MediaPickerModalProps) {
  const [search, setSearch] = useState("");
  const mediaQuery = useQuery({
    enabled: isOpen && Boolean(token),
    queryFn: () =>
      listMediaFiles(token, {
        page: 1,
        perPage: 24,
        search: search || undefined,
        type: acceptedType,
      }),
    queryKey: ["media", "picker", acceptedType, search],
  });
  const files = mediaQuery.data?.data ?? [];

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(String(new FormData(event.currentTarget).get("search") ?? ""));
  }

  return (
    <Modal isOpen={isOpen} title="Select media" onClose={onClose}>
      <div className="media-picker">
        <form className="toolbar" onSubmit={handleSearch}>
          <label className="search-field">
            <CmsIcon name="search" />
            <Input name="search" defaultValue={search} placeholder="Search media" />
          </label>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>

        {mediaQuery.error && (
          <ErrorState error={mediaQuery.error} fallback="Unable to load media picker." />
        )}

        {mediaQuery.isLoading ? (
          <LoadingState description="Fetching media files." title="Loading media" />
        ) : files.length === 0 ? (
          <EmptyPageState description="Upload media files before selecting one." title="No media" />
        ) : (
          <div className="media-picker-grid">
            {files.map((file) => (
              <button
                className="media-picker-item"
                key={file.id}
                type="button"
                onClick={() => {
                  onSelect(file);
                  onClose();
                }}
              >
                <MediaPickerPreview file={file} />
                <span>{file.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function MediaPickerPreview({ file }: { file: AdminMediaFile }) {
  if (file.mimeType.startsWith("image/")) {
    return <img alt={file.alt ?? file.name} src={file.url} />;
  }

  return (
    <span className="media-file-icon">
      <CmsIcon name="fileText" />
    </span>
  );
}
