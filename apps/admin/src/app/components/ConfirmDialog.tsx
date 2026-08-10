import { Button } from "@cms/ui";

import { Modal } from "./Modal";

type ConfirmDialogProps = {
  confirmLabel?: string;
  description: string;
  isOpen: boolean;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
};

export function ConfirmDialog({
  confirmLabel = "Confirm",
  description,
  isOpen,
  isPending = false,
  onClose,
  onConfirm,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <div className="confirm-dialog">
        <p>{description}</p>
        <div>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isPending} type="button" variant="danger" onClick={onConfirm}>
            {isPending ? "Working" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
