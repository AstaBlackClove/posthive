"use client";

import Link from "next/link";
import { MarketingNavBar } from "../../components/MarketingNavBar";
import { LandingFooter } from "../../components/LandingFooter";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4" style={{ marginBottom: 28 }}>
      <div
        className="flex items-center justify-center flex-shrink-0 rounded-full font-bold"
        style={{ width: 32, height: 32, backgroundColor: "#5b63d3", color: "#fff", fontSize: 14 }}
      >
        {n}
      </div>
      <div>
        <h3 className="font-semibold mb-1.5" style={{ color: "#ededed", fontSize: 16 }}>{title}</h3>
        <div style={{ color: "#999", fontSize: 14, lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}

function CopyBlock({ children }: { children: string }) {
  return (
    <pre
      className="rounded-xl overflow-x-auto"
      style={{ backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#ededed", padding: "12px 16px", fontSize: 13, fontFamily: "monospace", marginTop: 10 }}
    >
      {children}
    </pre>
  );
}

export default function GetStartedPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0a0a" }}>
      <MarketingNavBar />
      <main className="max-w-xl mx-auto px-4" style={{ paddingTop: 48, paddingBottom: 64 }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#5b63d3" }}>Setup guide</p>
        <h1 className="font-bold mb-3" style={{ color: "#ededed", fontSize: 28 }}>Paperclip runs the agent. Posthive does the posting.</h1>
        <p className="mb-10" style={{ color: "#888", fontSize: 15, lineHeight: 1.6 }}>
          <a href="https://github.com/paperclipai/paperclip" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: "#5b63d3" }}>Paperclip</a> schedules your agent, caps its spend, and gates it behind your approval.
          Posthive takes what it writes and publishes it to 14 platforms. Both self-hostable and open source Paperclip is MIT, Posthive is AGPL-3.0.
        </p>

        <Step n={1} title="Set up Posthive">
          <Link href="/register" className="font-semibold hover:underline" style={{ color: "#5b63d3" }}>posthive.co/register</Link> 14-day free trial, no card. Then connect your social accounts on the{" "}
          <Link href="/accounts" className="font-semibold hover:underline" style={{ color: "#5b63d3" }}>Accounts page</Link>.
        </Step>

        <Step n={2} title="Generate an API key">
          Settings → API Keys → Create. This is what Paperclip (or any agent) uses to post through Posthive.
        </Step>

        <Step n={3} title="Set up Paperclip">
          <a href="https://github.com/paperclipai/paperclip" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: "#5b63d3" }}>github.com/paperclipai/paperclip</a> self-host it, or use the hosted version. Bring your own agent (Claude Code, Codex, Cursor), set a schedule, a daily budget cap, and whether posts need your approval before they go out.
        </Step>

        <Step n={4} title="Point Paperclip at Posthive">
          Give Paperclip's agent the Posthive MCP connection so it can actually publish what it writes:
          <CopyBlock>{"claude mcp add --transport http posthive https://api.posthive.co/mcp/ph_your_key"}</CopyBlock>
          Works the same for Codex, Cursor, or any MCP-compatible agent same URL, same key.
        </Step>

        <Step n={5} title="Let it run">
          Paperclip's agent writes on schedule, inside its budget cap. If you turned on approval, you approve each draft before Posthive posts it otherwise it goes straight out, to every connected platform in one call.
        </Step>

        <div className="rounded-2xl text-center" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", padding: "28px 24px", marginTop: 40 }}>
          <p className="mb-4" style={{ color: "#888", fontSize: 14 }}>Full Posthive MCP docs, all tools, and example prompts:</p>
          <Link
            href="/docs#mcp-overview"
            className="inline-block py-2.5 px-6 font-semibold rounded-xl text-sm transition-opacity hover:bg-gray-100"
            style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
          >
            Read the full docs
          </Link>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
