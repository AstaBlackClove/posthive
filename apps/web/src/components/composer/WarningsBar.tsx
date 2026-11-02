import { cn } from "@/lib/cn";

interface Props {
  youtubeSelectedWithNoVideo: boolean;
  pinterestSelectedWithNoImage: boolean;
  pixelfedSelectedWithNoImage: boolean;
  tiktokSelectedWithNoVideo?: boolean;
  instagramSelectedWithNoMedia?: boolean;
  instagramStoryWithNoImage?: boolean;
  twitterHasLink: boolean;
  blueskyFirstCommentTooLong?: boolean;
  youtubePrivateWithComment?: boolean;
  igMediaType?: "post" | "reel" | "story";
  className?: string;
}

export function WarningsBar({
  youtubeSelectedWithNoVideo,
  pinterestSelectedWithNoImage,
  pixelfedSelectedWithNoImage,
  tiktokSelectedWithNoVideo,
  instagramSelectedWithNoMedia,
  instagramStoryWithNoImage,
  twitterHasLink,
  blueskyFirstCommentTooLong,
  youtubePrivateWithComment,
  igMediaType,
  className,
}: Props) {
  const hasAny =
    instagramSelectedWithNoMedia ||
    instagramStoryWithNoImage ||
    youtubeSelectedWithNoVideo ||
    pinterestSelectedWithNoImage ||
    pixelfedSelectedWithNoImage ||
    tiktokSelectedWithNoVideo ||
    twitterHasLink ||
    blueskyFirstCommentTooLong ||
    youtubePrivateWithComment;

  if (!hasAny) return null;

  return (
    <div className={cn("flex flex-wrap gap-x-6 gap-y-1 px-4 py-2 border-t border-border bg-bg", className)}>
      {instagramSelectedWithNoMedia && (
        <p className="type-body-m-xs text-brand-800">
          ⚠️ {igMediaType === "reel" ? "Add a video for this Reel" : "Instagram requires an image"}
        </p>
      )}
      {instagramStoryWithNoImage && (
        <p className="type-body-m-xs text-brand-800">
          ⚠️ Add an image for the Instagram Story
        </p>
      )}
      {youtubeSelectedWithNoVideo && (
        <p className="type-body-m-xs text-red-600">
          ⚠️ YouTube requires a video before you can schedule this post
        </p>
      )}
      {tiktokSelectedWithNoVideo && (
        <p className="type-body-m-xs text-red-600">
          ⚠️ TikTok requires a video — attach an mp4 or mov file before scheduling
        </p>
      )}
      {pinterestSelectedWithNoImage && (
        <p className="type-body-m-xs text-brand-800">
          ⚠️ Pinterest requires an image add one or the Pin will be skipped
        </p>
      )}
      {pixelfedSelectedWithNoImage && (
        <p className="type-body-m-xs text-brand-800">
          ⚠️ Pixelfed requires at least one image
        </p>
      )}
      {twitterHasLink && (
        <p className="type-body-m-xs text-red-600">
          ⚠️ X/Twitter charges $0.20 per tweet containing a link remove the URL to schedule
        </p>
      )}
      {blueskyFirstCommentTooLong && (
        <p className="type-body-m-xs text-brand-800">
          ⚠️ Bluesky first comment exceeds 300 characters — use &quot;Customize per platform&quot; to set a shorter version for Bluesky
        </p>
      )}
      {youtubePrivateWithComment && (
        <p className="type-body-m-xs text-brand-800">
          ⚠️ YouTube private videos can&apos;t receive comments — the first comment will be skipped
        </p>
      )}
    </div>
  );
}
