import Link from "next/link";
import { FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sourceLine, type ImportSource } from "@/lib/content-list";

/** The plan file the newest import came from: its name, when and by whom, and a way to import another. */
export function SourceCard({ source, canImport }: { source: ImportSource; canImport: boolean }) {
  return (
    <Card className="flex-col items-stretch gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
      <span aria-hidden="true" className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-bg text-muted-foreground sm:flex">
        <FolderIcon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate type-body-sb-m text-fg" title={source.fileName}>
          {source.fileName}
        </h2>
        <p className="mt-0.5 type-body-r-xs text-muted-foreground">{sourceLine(source)}</p>
      </div>
      {canImport && (
        <Button asChild variant="secondary" className="shrink-0 border-neutral-500 text-neutral-600 max-sm:w-full">
          <Link href="/jobs/import">Import new plan</Link>
        </Button>
      )}
    </Card>
  );
}
