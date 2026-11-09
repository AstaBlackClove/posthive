"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/FormField";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Create a separate workspace for a team or project. A full reload follows, which also switches to it. */
export function NewWorkspaceDialog({ open, onOpenChange }: Props) {
  const { error } = useToast();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  function handleOpenChange(next: boolean) {
    if (loading) return;
    if (!next) setName("");
    onOpenChange(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await apiFetch("/workspaces", { method: "POST", body: JSON.stringify({ name: trimmed }) });
      onOpenChange(false);
      setName("");
      // A reload clears every workspace-scoped bit of client state
      window.location.href = "/dashboard";
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>
            Create a separate workspace for a team or project. You can upgrade it to a paid plan later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Workspace name">
            {(c) => <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing Team" {...c} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
