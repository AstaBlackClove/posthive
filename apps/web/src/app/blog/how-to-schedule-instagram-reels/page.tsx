import Link from "next/link";
import type { Metadata } from "next";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to Schedule Instagram Reels in 2026 (Step-by-Step Guide)",
  description: "Learn how to schedule Instagram Reels in advance using Posthive. Save hours every week by batching your Reels content and publishing automatically at peak times.",
  datePublished: "2026-07-07",
  author: { "@type": "Person", name: "Guna" },
  publisher: { "@type": "Organization", name: "Posthive", url: WEB_URL },
  url: `${WEB_URL}/blog/how-to-schedule-instagram-reels`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can you schedule Instagram Reels in advance?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. You can schedule Instagram Reels using a third-party tool like Posthive. Connect your Instagram Business or Creator account, upload your Reel video, write your caption, and set a publish time. Posthive handles the rest automatically." },
    },
    {
      "@type": "Question",
      name: "How to schedule Instagram Reels for free?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive offers a 14-day free trial with full Instagram Reels scheduling support. You can also use Meta Business Suite to schedule Reels directly, though it has fewer automation features than dedicated schedulers." },
    },
    {
      "@type": "Question",
      name: "Can I schedule Instagram Reels with Meta Business Suite?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Meta Business Suite lets you schedule Reels natively, but only for Instagram. If you post to multiple platforms, a tool like Posthive lets you schedule Reels alongside posts to Bluesky, Threads, LinkedIn, and more in one workflow." },
    },
    {
      "@type": "Question",
      name: "What type of Instagram account do I need to schedule Reels?",
      acceptedAnswer: { "@type": "Answer", text: "You need an Instagram Business or Creator account. Personal accounts are not supported by the Instagram Content Publishing API. Switching is free and takes under a minute in the Instagram settings." },
    },
    {
      "@type": "Question",
      name: "What is the best time to post Instagram Reels?",
      acceptedAnswer: { "@type": "Answer", text: "Research consistently shows that Tuesday, Wednesday, and Friday between 9am and 11am, and again between 6pm and 9pm, tend to get the highest engagement. Scheduling tools let you hit these windows even when you are not online." },
    },
    {
      "@type": "Question",
      name: "Does scheduling Instagram Reels affect views?",
      acceptedAnswer: { "@type": "Answer", text: "No. Scheduling a Reel through a Meta-approved third-party tool does not affect its reach or views. The Reel is published through the official Instagram Content Publishing API — Instagram cannot tell the difference between a scheduled post and a manually posted one." },
    },
    {
      "@type": "Question",
      name: "How many Reels can you schedule on Instagram?",
      acceptedAnswer: { "@type": "Answer", text: "There is no official cap on how many Reels you can schedule. The Instagram Content Publishing API allows up to 50 API calls per 24 hours per account for publishing. In practice, scheduling 1-3 Reels per day is well within limits and considered normal usage." },
    },
    {
      "@type": "Question",
      name: "Can I see my scheduled Reels on Instagram?",
      acceptedAnswer: { "@type": "Answer", text: "Not directly in the Instagram app. Scheduled Reels are visible in the tool you used to schedule them (such as Posthive's content calendar or Meta Business Suite's planner). Once published, they appear in your profile like any other Reel." },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Schedule Instagram Reels",
  description: "A step-by-step guide to scheduling Instagram Reels using Posthive.",
  step: [
    { "@type": "HowToStep", position: 1, name: "Connect your Instagram account", text: "Sign up for Posthive and connect your Instagram Business or Creator account via Meta OAuth." },
    { "@type": "HowToStep", position: 2, name: "Open the Compose page", text: "Click Compose in the Posthive sidebar. Select your Instagram account from the platform list." },
    { "@type": "HowToStep", position: 3, name: "Choose Reel as the content type", text: "Select Reel from the Instagram content type selector. Upload your MP4 video file." },
    { "@type": "HowToStep", position: 4, name: "Write your caption", text: "Write your Reel caption. Optionally add hashtags to the first comment field to keep the caption clean." },
    { "@type": "HowToStep", position: 5, name: "Set your publish time", text: "Pick a date and time. Posthive will publish your Reel automatically at that exact moment." },
  ],
};

export const metadata: Metadata = {
  title: "How to Schedule Instagram Reels in 2026 (Step-by-Step) | Posthive",
  description: "Learn how to schedule Instagram Reels in advance. Save hours every week by batching your content and publishing automatically at peak times.",
  keywords: ["schedule instagram reels", "how to schedule instagram reels", "can you schedule instagram reels", "instagram reels scheduler", "schedule reels in advance"],
  alternates: { canonical: `${WEB_URL}/blog/how-to-schedule-instagram-reels` },
  openGraph: {
    title: "How to Schedule Instagram Reels in 2026 | Posthive",
    description: "Learn how to schedule Instagram Reels in advance and publish automatically at peak times.",
    url: `${WEB_URL}/blog/how-to-schedule-instagram-reels`,
    images: [{ url: "/api/og?layout=post&title=How+to+Schedule+Instagram+Reels&desc=Step-by-step+guide+for+2026&badge=Guide", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Schedule Instagram Reels in 2026 | Posthive",
    description: "Learn how to schedule Instagram Reels in advance and publish automatically at peak times.",
  },
};

function BlogNav() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: 64, background: "#0a0a0a", borderBottom: "1px solid #1a1a1a",
      display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px",
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <img src="/posthivemain.png" alt="Posthive" style={{ height: 28 }} />
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Link href="/blog" style={{ fontSize: 14, color: "#888", textDecoration: "none" }}>Blog</Link>
        <Link href="/pricing" style={{ fontSize: 14, color: "#888", textDecoration: "none" }}>Pricing</Link>
        <Link href="/docs" style={{ fontSize: 14, color: "#888", textDecoration: "none" }}>Docs</Link>
        <Link href="/register" style={{ fontSize: 14, fontWeight: 600, padding: "8px 16px", borderRadius: 8, background: "#5b63d3", color: "#fff", textDecoration: "none" }}>Get started</Link>
      </div>
    </nav>
  );
}

function Callout({ children, color = "#5b63d3" }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: `${color}11`, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "14px 18px", margin: "28px 0" }}>
      {children}
    </div>
  );
}

function StepCard({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: 18, marginBottom: 24 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(91,99,211,.15)", border: "1px solid rgba(91,99,211,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: "#9ba2ee" }}>0{n}</span>
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#ededed", margin: "0 0 6px" }}>{title}</p>
        <p style={{ fontSize: 14, color: "#666", lineHeight: 1.75, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

export default function HowToScheduleInstagramReelsPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "system-ui, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <BlogNav />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 100px" }}>

        <Link href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", textDecoration: "none", marginBottom: 40 }}>
          All posts
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#e86b6b", background: "rgba(232,107,107,.1)", borderRadius: 6, padding: "3px 9px", letterSpacing: ".04em" }}>Guide</span>
          <span style={{ fontSize: 12, color: "#444" }}>July 7, 2026</span>
          <span style={{ fontSize: 12, color: "#444" }}>· 8 min read</span>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 24px", color: "#ededed" }}>
          How to Schedule Instagram Reels in 2026 (Step-by-Step Guide)
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderTop: "1px solid #1e1e1e", borderBottom: "1px solid #1e1e1e", marginBottom: 40 }}>
          <img src="/founder.png" alt="Founder" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>Guna</div>
            <div style={{ fontSize: 12, color: "#555" }}>Founder, Posthive</div>
          </div>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.85, color: "#888" }}>

          {/* Quick answer box — featured snippet target */}
          <div style={{ background: "#111", border: "1px solid #2a2a2a", borderLeft: "3px solid #5b63d3", borderRadius: 8, padding: "18px 20px", marginBottom: 32 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#5b63d3", letterSpacing: ".06em", textTransform: "uppercase", margin: "0 0 10px" }}>Quick answer</p>
            <p style={{ fontSize: 15, color: "#ccc", lineHeight: 1.7, margin: 0 }}>
              <strong style={{ color: "#ededed" }}>Yes, you can schedule Instagram Reels.</strong> Use a third-party tool like Posthive or Meta Business Suite. You need an Instagram Business or Creator account (personal accounts are not supported). Upload your MP4, write your caption, pick a time — the tool publishes automatically.
            </p>
          </div>

          <p style={{ marginBottom: 24 }}>
            Scheduling Instagram Reels is one of the highest-leverage habits a creator can build. Reels are the single fastest way to grow on Instagram right now, but they only work consistently if you post at the right times and maintain a regular cadence. Most creators miss both because they rely on posting manually.
          </p>

          <p style={{ marginBottom: 24 }}>
            This guide covers everything you need to know: whether scheduling Reels is possible, which tools support it, the exact steps to do it in Posthive, and the best times to post for maximum reach.
          </p>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Can you schedule Instagram Reels?
          </h2>

          <p style={{ marginBottom: 24 }}>
            Yes. Instagram supports Reel scheduling through its official Content Publishing API. Third-party tools like Posthive use this API to schedule Reels on your behalf. You upload your video, write your caption, pick a time, and the tool publishes it automatically at that exact moment.
          </p>

          <p style={{ marginBottom: 24 }}>
            There is one requirement: your Instagram account must be set to Business or Creator mode. Personal accounts are not supported by the API. Switching is free and takes under a minute in your Instagram settings.
          </p>

          <Callout color="#e86b6b">
            <p style={{ fontSize: 14, color: "#e86b6b", fontWeight: 700, margin: "0 0 6px" }}>Account requirement</p>
            <p style={{ fontSize: 14, color: "#aaa", margin: 0 }}>
              Only Instagram Business and Creator accounts can schedule Reels via the API. Go to Instagram Settings, tap Account, then Switch to Professional Account to upgrade for free.
            </p>
          </Callout>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Why scheduling Reels matters
          </h2>

          <p style={{ marginBottom: 20 }}>
            The Instagram algorithm distributes Reels based on early engagement signals. If you post when your audience is not online, your Reel gets poor early engagement, and the algorithm limits its reach. Scheduling lets you consistently hit peak times without having to be at your phone.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "28px 0" }}>
            {[
              { title: "Post at peak hours", desc: "Schedule during 9am-11am and 6pm-9pm when your audience is most active, without being online yourself." },
              { title: "Batch your content", desc: "Film and edit a week of Reels in one session, then schedule them to publish daily. One hour of work, seven days of content." },
              { title: "Stay consistent", desc: "The algorithm rewards creators who post regularly. Scheduling makes consistency automatic instead of a daily decision." },
              { title: "Cross-post alongside", desc: "Posthive lets you schedule your Reel on Instagram while simultaneously posting to Bluesky, LinkedIn, and Threads." },
            ].map((item) => (
              <div key={item.title} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "16px 18px" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#ededed", margin: "0 0 8px" }}>{item.title}</p>
                <p style={{ fontSize: 13, color: "#666", lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            How to schedule Instagram Reels with Posthive
          </h2>

          <p style={{ marginBottom: 28 }}>
            Posthive supports Instagram Reels, Stories, carousels, and feed posts all from the same composer. Here is the exact process:
          </p>

          <StepCard n={1} title="Create your Posthive account" desc="Sign up at posthive.co. The 14-day free trial includes full Instagram scheduling support. No credit card required." />
          <StepCard n={2} title="Connect your Instagram account" desc="Go to Accounts in the sidebar. Click Connect Instagram and follow the Meta OAuth flow. Posthive will ask for publishing permissions. This takes about 60 seconds." />
          <StepCard n={3} title="Open the Compose page" desc="Click Compose in the sidebar. Select your Instagram account from the platform picker at the top of the composer." />
          <StepCard n={4} title="Select Reel as the content type" desc="Below the platform selector, you will see content type options: Feed Post, Reel, Story, Carousel. Select Reel. An upload area will appear for your video file." />
          <StepCard n={5} title="Upload your Reel video" desc="Drag and drop your MP4 file or click to browse. Instagram requires MP4 format, between 3 seconds and 15 minutes, with 9:16 aspect ratio recommended for best presentation." />
          <StepCard n={6} title="Write your caption" desc="Write your caption in the text area. If you want to use hashtags without cluttering your caption, add them in the First Comment field below. Posthive posts the comment automatically right after the Reel goes live." />
          <StepCard n={7} title="Set your publish time" desc="Click the date and time picker and choose when you want the Reel to go live. Posthive handles the rest." />
          <StepCard n={8} title="Schedule" desc="Click Schedule. Your Reel appears on the content calendar. At the exact time you chose, Posthive publishes it through the Instagram API automatically." />

          <Callout color="#5b63d3">
            <p style={{ fontSize: 14, color: "#9ba2ee", fontWeight: 700, margin: "0 0 6px" }}>Pro tip: First comment for hashtags</p>
            <p style={{ fontSize: 14, color: "#aaa", margin: 0 }}>
              Putting hashtags in the first comment instead of the caption keeps your caption clean and readable. Research suggests this can improve save rates because the caption looks less cluttered. Posthive posts the first comment automatically within seconds of the Reel going live.
            </p>
          </Callout>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            How to schedule Instagram Reels with Meta Business Suite
          </h2>

          <p style={{ marginBottom: 24 }}>
            Meta Business Suite has a built-in scheduling tool for Reels. It is free and does not require a third-party account. Here is how it works:
          </p>

          <ol style={{ paddingLeft: 20, marginBottom: 28 }}>
            {[
              "Go to business.facebook.com and connect your Instagram account.",
              "Click Create Post in the left sidebar.",
              "Select Instagram in the platform selector.",
              "Upload your video and toggle the Reel format.",
              "Write your caption.",
              "Click the arrow next to Publish and select Schedule.",
              "Pick your date and time, then confirm.",
            ].map((step, i) => (
              <li key={i} style={{ fontSize: 14, color: "#777", lineHeight: 1.85, marginBottom: 6 }}>{step}</li>
            ))}
          </ol>

          <p style={{ marginBottom: 24 }}>
            The limitation with Meta Business Suite is that it only covers Instagram and Facebook. If you post on Bluesky, LinkedIn, Threads, or any other platform, you will need a separate workflow for those. Posthive covers multiple platforms from one composer.
          </p>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Best times to post Instagram Reels
          </h2>

          <p style={{ marginBottom: 20 }}>
            Timing matters because Instagram uses early engagement (views, likes, shares in the first 30-60 minutes) to decide how widely to distribute a Reel. Posting when your audience is not active means fewer early signals, which means less distribution.
          </p>

          <div style={{ overflowX: "auto", marginBottom: 28 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 12 }}>Day</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 12 }}>Best times</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 12 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Monday", "9am, 12pm, 6pm", "Good engagement as the week starts"],
                  ["Tuesday", "9am, 11am, 7pm", "Consistently high across audiences"],
                  ["Wednesday", "10am, 12pm, 6pm", "Mid-week peak, strong for B2B content"],
                  ["Thursday", "9am, 11am, 6pm", "High intent browsing before the weekend"],
                  ["Friday", "9am, 12pm, 5pm", "Strong morning, drops after 5pm"],
                  ["Saturday", "10am, 1pm", "Leisure browsing, lower overall volume"],
                  ["Sunday", "11am, 2pm", "Lowest day on average, use for evergreen"],
                ].map(([day, times, note]) => (
                  <tr key={day as string} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "10px 14px", color: "#ededed", fontWeight: 600, fontSize: 14 }}>{day as string}</td>
                    <td style={{ padding: "10px 14px", color: "#9ba2ee", fontSize: 13, fontFamily: "monospace" }}>{times as string}</td>
                    <td style={{ padding: "10px 14px", color: "#555", fontSize: 13 }}>{note as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ marginBottom: 24 }}>
            These are general benchmarks. Your specific audience may differ. Check your Instagram Insights after 4-6 weeks of consistent posting to see when your followers are most active, then adjust your schedule accordingly.
          </p>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Instagram Reels specifications for scheduling
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 28 }}>
            {[
              { label: "Format", value: "MP4 or MOV" },
              { label: "Aspect ratio", value: "9:16 recommended (vertical). 4:5 and 1:1 also supported" },
              { label: "Resolution", value: "1080 x 1920px recommended" },
              { label: "Duration", value: "3 seconds to 15 minutes" },
              { label: "File size", value: "Up to 1GB" },
              { label: "Frame rate", value: "23-60fps" },
              { label: "Audio", value: "AAC, max 128kbps" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", gap: 16, padding: "10px 0", borderBottom: "1px solid #111" }}>
                <span style={{ fontSize: 13, color: "#555", fontWeight: 700, minWidth: 120 }}>{row.label}</span>
                <span style={{ fontSize: 13, color: "#aaa" }}>{row.value}</span>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Does scheduling Instagram Reels affect views?
          </h2>

          <p style={{ marginBottom: 24 }}>
            No. Scheduling a Reel through a Meta-approved tool does not hurt your reach or views. The Reel is published via the official Instagram Content Publishing API — Instagram cannot distinguish between a scheduled post and one posted manually.
          </p>

          <p style={{ marginBottom: 24 }}>
            The myth that scheduling reduces reach comes from the early days of third-party tools that used unofficial workarounds. Modern schedulers like Posthive use the official API, which Meta explicitly supports for business accounts.
          </p>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            How many Reels can you schedule on Instagram?
          </h2>

          <p style={{ marginBottom: 24 }}>
            There is no hard limit on how many Reels you can schedule. The Instagram Content Publishing API allows up to 50 publish calls per 24 hours per account. Posting 1–3 Reels per day is well within limits and considered normal usage. Scheduling dozens per day is technically possible but not recommended — Instagram may flag unusually high posting frequency as spam.
          </p>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Frequently asked questions
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 32 }}>
            {faqSchema.mainEntity.map((item) => (
              <div key={item.name} style={{ borderBottom: "1px solid #1a1a1a", padding: "22px 0" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#ededed", margin: "0 0 10px" }}>{item.name}</p>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.75, margin: 0 }}>{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "32px 28px", textAlign: "center", marginTop: 48 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#ededed", margin: "0 0 10px" }}>Start scheduling Instagram Reels today</p>
            <p style={{ fontSize: 14, color: "#666", margin: "0 0 24px" }}>14-day free trial. No credit card required. Connect your Instagram account in under a minute.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none" }}>
                Get started free
              </Link>
              <Link href="/features/instagram-reels-scheduler" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#111", color: "#888", textDecoration: "none", border: "1px solid #2a2a2a" }}>
                See Instagram features
              </Link>
            </div>
          </div>

          {/* Related reading */}
          <div style={{ borderTop: "1px solid #1e1e1e", marginTop: 48, paddingTop: 36 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#555", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 16 }}>Related reading</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { href: "/platforms/instagram", label: "Instagram scheduler: Reels, Stories, carousels, and feed posts" },
                { href: "/blog/best-social-media-scheduler", label: "The best social media schedulers in 2026 compared" },
                { href: "/blog/canva-social-media-scheduler-alternative", label: "Canva social media scheduler alternative" },
                { href: "/platforms/facebook", label: "Keep your Facebook Page active on autopilot" },
                { href: "/platforms/youtube", label: "Schedule YouTube Shorts without opening YouTube Studio" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} style={{ fontSize: 14, color: "#5b63d3", textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#333" }}>→</span> {label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {([["Privacy", "/privacy"], ["Terms", "/terms"], ["Docs", "/docs"], ["Pricing", "/pricing"], ["Blog", "/blog"]] as [string, string][]).map(([label, href]) => (
            <Link key={label} href={href} style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#444" }}>© {new Date().getFullYear()} Posthive · AGPL-3.0</p>
      </footer>
    </div>
  );
}
