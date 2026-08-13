"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const MARKETING_EXACT = ["/", "/pricing", "/docs", "/agent", "/blog", "/privacy", "/terms", "/login", "/register", "/forgot-password", "/features"];
const MARKETING_PREFIXES = ["/blog/", "/platforms/", "/features/"];

function isMarketingPath(pathname: string) {
  return MARKETING_EXACT.includes(pathname) || MARKETING_PREFIXES.some((p) => pathname.startsWith(p));
}

const WIDGET_SELECTORS = [
  '[id*="bestchatbot"]',
  '[class*="bestchatbot"]',
  'iframe[src*="bestchatbot"]',
  '[id*="chatbot"]',
  '[class*="chat-widget"]',
].join(", ");

export function ChatWidget() {
  const pathname = usePathname();
  const isMarketing = isMarketingPath(pathname);

  useEffect(() => {
    const show = isMarketingPath(pathname);
    const toggle = () => {
      document.querySelectorAll<HTMLElement>(WIDGET_SELECTORS).forEach((el) => {
        el.style.setProperty("display", show ? "" : "none", "important");
      });
    };
    toggle();
    const t = setTimeout(toggle, 1500);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!isMarketing) return null;

  return (
    <Script
      src="https://widget.bestchatbot.io/widget/v1/chat.js"
      data-api-key={process.env.NEXT_PUBLIC_CHATBOT_KEY ?? ""}
      strategy="lazyOnload"
    />
  );
}
