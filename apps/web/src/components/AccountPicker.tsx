"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "lucide-react";
import { AccountAvatar } from "@/components/AccountAvatar";
import { PLATFORM_COLOR } from "@/components/PlatformPreview";
import { cn } from "@/lib/cn";
import { platformLabel } from "@/lib/platforms";

export interface PickerAccount {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl?: string | null;
}

type Props = {
  accounts: PickerAccount[];
  /** Ids of the chosen accounts. */
  value: string[];
  onChange: (ids: string[]) => void;
  /** Shown when there are no accounts, e.g. a link to connect one. */
  empty?: ReactNode;
  /** Accessible name of the group. */
  label?: string;
  className?: string;
};

/** A list of accounts to tick: account groups, library settings. Each row tints with its platform colour. */
export function AccountPicker({ accounts, value, onChange, empty, label = "Accounts", className }: Props) {
  if (accounts.length === 0) {
    return empty ? <div className="type-body-r-xs text-muted">{empty}</div> : null;
  }

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div role="group" aria-label={label} className={cn("space-y-1.5", className)}>
      {accounts.map((a) => {
        const on = value.includes(a.id);
        return (
          <button
            key={a.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(a.id)}
            // runtime platform colour as a CSS variable
            style={{ "--platform": PLATFORM_COLOR[a.platform] ?? "#6b7280" } as React.CSSProperties}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              on ? "border-(color:--platform)/25 bg-(color:--platform)/7" : "border-border bg-bg"
            )}
          >
            <AccountAvatar platform={a.platform} avatarUrl={a.avatarUrl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate type-body-m-s text-fg">{a.displayName}</span>
              <span className={cn("block type-body-r-xs", on ? "text-(color:--platform)" : "text-muted")}>
                {platformLabel(a.platform)}
              </span>
            </span>
            {on && <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-(color:--platform)" strokeWidth={2.5} />}
          </button>
        );
      })}
    </div>
  );
}
