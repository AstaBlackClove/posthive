import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect Claude to Posthive — Setup Guide",
  description: "Connect Paperclip to run your agent on a schedule with budget caps and approval gates, then connect Posthive to post to 14 platforms.",
};

export default function GetStartedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
