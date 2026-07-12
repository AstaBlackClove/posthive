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
  discord:   "discord.com",
  tumblr:    "tumblr.com",
};

function TelegramSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path d="M17.93 6.47L15.5 17.5c-.18.8-.65 1-1.32.63l-3.64-2.68-1.76 1.7c-.2.19-.36.35-.73.35l.26-3.7 6.7-6.05c.29-.26-.06-.4-.45-.14L6.1 13.47 2.52 12.36c-.79-.25-.8-.79.16-1.16L16.96 5.36c.66-.24 1.23.16.97 1.11z" fill="white" />
    </svg>
  );
}

interface Props {
  platform: string;
  size?: number;
  className?: string;
}

export function PlatformIcon({ platform, size = 16, className }: Props) {
  if (platform === "nostr") return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/Nostr.svg" alt="nostr" width={size} height={size}
      style={{ objectFit: "contain", display: "inline-block", borderRadius: size * 0.18 }} />
  );
  if (platform === "telegram") return <TelegramSvg size={size} />;

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
