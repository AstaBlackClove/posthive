const PLATFORM_DOMAIN: Record<string, string> = {
  bluesky:   "bsky.app",
  threads:   "threads.net",
  instagram: "instagram.com",
  linkedin:  "linkedin.com",
  mastodon:  "mastodon.social",
  youtube:   "youtube.com",
  facebook:  "facebook.com",
  twitter:   "x.com",
  pinterest: "pinterest.com",
};

interface Props {
  platform: string;
  size?: number;
  className?: string;
}

export function PlatformIcon({ platform, size = 16, className }: Props) {
  const domain = PLATFORM_DOMAIN[platform];
  if (!domain) return <span style={{ fontSize: size * 0.75 }}>🌐</span>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${size >= 24 ? 64 : 32}`}
      alt={platform}
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", display: "inline-block" }}
    />
  );
}
