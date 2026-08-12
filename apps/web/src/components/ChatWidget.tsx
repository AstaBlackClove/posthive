"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const MARKETING_EXACT = ["/", "/pricing", "/docs", "/agent", "/blog", "/privacy", "/terms", "/login", "/register", "/forgot-password", "/features"];
const MARKETING_PREFIXES = ["/blog/", "/platforms/", "/features/"];

export function ChatWidget() {
  const pathname = usePathname();
  const isMarketing =
    MARKETING_EXACT.includes(pathname) ||
    MARKETING_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isMarketing) return null;

  return (
    <Script
      src="https://widget.bestchatbot.io/widget/v1/chat.js"
      data-api-key={process.env.NEXT_PUBLIC_CHATBOT_KEY ?? ""}
      strategy="lazyOnload"
    />
  );
}
