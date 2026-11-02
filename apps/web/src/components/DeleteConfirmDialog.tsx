"use client";

import { useState } from "react";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  postText: string;
}

export function DeleteConfirmDialog({ open, onClose, onConfirm, postText }: Props) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try { await onConfirm(); }
    finally { setDeleting(false); }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={440}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50">
            <svg className="size-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="type-body-sb-m text-fg">Delete this post?</h2>
            <p className="mt-1 type-body-r-s text-muted">
              This will permanently delete the scheduled post and any uploaded images. This cannot be undone.
            </p>
            {postText && (
              <div className="card mt-3 rounded-xl px-3 py-2.5">
                <p className="type-body-r-xs text-neutral-500">
                  {postText.length > 160 ? postText.slice(0, 160) + "…" : postText}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} disabled={deleting} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={deleting} className="btn-danger">
            {deleting ? "Deleting…" : "Delete post"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
