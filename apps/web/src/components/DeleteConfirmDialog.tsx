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
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#200a0a", border: "1px solid #5a1a1a" }}>
            <svg className="w-5 h-5" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold" style={{ color: "#ededed" }}>Delete this post?</h2>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: "#666" }}>
              This will permanently delete the scheduled post and any uploaded images. This cannot be undone.
            </p>
            {postText && (
              <div className="mt-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
                <p className="text-xs leading-relaxed" style={{ color: "#777" }}>
                  {postText.length > 160 ? postText.slice(0, 160) + "…" : postText}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          <button onClick={onClose} disabled={deleting}
            className="px-4 py-2 text-sm rounded-xl font-medium transition-colors disabled:opacity-40"
            style={{ backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={deleting}
            className="px-4 py-2 text-sm rounded-xl font-semibold transition-colors disabled:opacity-40"
            style={{ backgroundColor: "#ef4444", color: "#fff" }}>
            {deleting ? "Deleting…" : "Delete post"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
