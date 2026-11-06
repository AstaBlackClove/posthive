"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlatformIcon } from "@/components/PlatformIcon";
import { PLATFORM_COLOR } from "@/components/PlatformPreview";
import { cn } from "@/lib/cn";

type Props = {
  platform: string;
  avatarUrl?: string | null;
  /** Used as the image's alt text; leave out when the name is written next to the avatar. */
  name?: string;
  size?: "sm" | "default" | "lg";
  /** The small platform logo in the corner. Off for "sm". */
  badge?: boolean;
  className?: string;
};

/**
 * A connected account: its profile picture, or a tile in the platform's colour with the platform
 * logo when there is none or it fails to load, plus the platform logo in the corner.
 */
export function AccountAvatar({ platform, avatarUrl, name, size = "default", badge, className }: Props) {
  const showBadge = badge ?? size !== "sm";
  const color = PLATFORM_COLOR[platform] ?? "#6b7280";
  const icon = size === "lg" ? 20 : size === "sm" ? 12 : 16;
  return (
    <div
      className={cn("relative shrink-0", className)}
      // The platform colour is a runtime value: set as a CSS variable, read by the classes below.
      style={{ "--platform": color } as React.CSSProperties}
    >
      <Avatar size={size}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? ""} />}
        <AvatarFallback className="border border-(color:--platform)/20 bg-(color:--platform)/12">
          <PlatformIcon platform={platform} size={icon} />
        </AvatarFallback>
      </Avatar>
      {showBadge && (
        <div
          className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border border-border bg-bg"
          data-slot="account-avatar-badge"
        >
          <PlatformIcon platform={platform} size={10} />
        </div>
      )}
    </div>
  );
}
