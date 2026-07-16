interface Props {
  youtubeSelectedWithNoVideo: boolean;
  pinterestSelectedWithNoImage: boolean;
  instagramSelectedWithNoMedia?: boolean;
  instagramStoryWithNoImage?: boolean;
  twitterHasLink: boolean;
  igMediaType?: "post" | "reel" | "story";
  className?: string;
}

export function WarningsBar({
  youtubeSelectedWithNoVideo,
  pinterestSelectedWithNoImage,
  instagramSelectedWithNoMedia,
  instagramStoryWithNoImage,
  twitterHasLink,
  igMediaType,
  className,
}: Props) {
  const hasAny =
    instagramSelectedWithNoMedia ||
    instagramStoryWithNoImage ||
    youtubeSelectedWithNoVideo ||
    pinterestSelectedWithNoImage ||
    twitterHasLink;

  if (!hasAny) return null;

  return (
    <div
      className={`flex flex-wrap gap-x-6 gap-y-1 px-4 py-2 ${className ?? ""}`}
      style={{ borderTop: "1px solid #2a2a2a", backgroundColor: "#0d0d0d" }}
    >
      {instagramSelectedWithNoMedia && (
        <p className="text-xs font-medium" style={{ color: "#f59e0b" }}>
          ⚠️ {igMediaType === "reel" ? "Add a video for this Reel" : "Instagram requires an image"}
        </p>
      )}
      {instagramStoryWithNoImage && (
        <p className="text-xs font-medium" style={{ color: "#f59e0b" }}>
          ⚠️ Add an image for the Instagram Story
        </p>
      )}
      {youtubeSelectedWithNoVideo && (
        <p className="text-xs font-medium" style={{ color: "#ef4444" }}>
          ⚠️ YouTube requires a video before you can schedule this post
        </p>
      )}
      {pinterestSelectedWithNoImage && (
        <p className="text-xs font-medium" style={{ color: "#f59e0b" }}>
          ⚠️ Pinterest requires an image — add one or the Pin will be skipped
        </p>
      )}
      {twitterHasLink && (
        <p className="text-xs font-medium" style={{ color: "#ef4444" }}>
          ⚠️ X/Twitter charges $0.20 per tweet containing a link — remove the URL to schedule
        </p>
      )}
    </div>
  );
}
