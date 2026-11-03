import Link from "next/link";
import type { Metadata } from "next";
import { cn } from "../../../lib/cn";
import { BlogCtaBanner } from "../../../components/BlogCtaBanner";
import { BlogPostHeader } from "../../../components/BlogPostHeader";
import { SiteNav } from "../../../components/SiteNav";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to Schedule Instagram Reels in 2026 (Step-by-Step Guide)",
  description: "Learn how to schedule Instagram Reels in advance using Posthive. Save hours every week by batching your Reels content and publishing automatically at peak times.",
  datePublished: "2026-07-07",
  dateModified: "2026-07-30",
  image: `${WEB_URL}/og/landingogimage.jpg`,
  author: { "@type": "Person", name: "Guna", url: "https://x.com/gunaa_dev" },
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
    {
      "@type": "Question",
      name: "How do I find my scheduled Reels on Instagram?",
      acceptedAnswer: { "@type": "Answer", text: "Instagram does not show scheduled Reels inside the app itself. To find your scheduled Reels, open the tool you used to schedule them — in Posthive, go to the Posts page or calendar view to see all upcoming scheduled content. In Meta Business Suite, go to the Planner tab." },
    },
    {
      "@type": "Question",
      name: "Does scheduling Instagram Reels affect the algorithm?",
      acceptedAnswer: { "@type": "Answer", text: "No. Scheduling a Reel through a Meta-approved tool does not negatively affect the Instagram algorithm or its distribution. The Reel is published via the official Instagram Content Publishing API, which Instagram explicitly supports. What does affect reach is timing — scheduling lets you post during peak hours when your audience is most active, which can actually improve early engagement signals." },
    },
    {
      "@type": "Question",
      name: "Can I schedule Instagram Reels and Facebook posts at the same time?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. With Posthive, you can schedule a Reel to Instagram and a post to your Facebook Page simultaneously from one composer. Select both accounts in the platform picker, upload your video, write your caption, and schedule once. Both publish at the same time." },
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
  title: "How to Schedule Instagram Reels in 2026 | Posthive",
  description: "Learn how to schedule Instagram Reels in advance. Save hours every week by batching your content and publishing automatically at peak times.",
  keywords: ["schedule instagram reels", "how to schedule instagram reels", "can you schedule instagram reels", "instagram reels scheduler", "schedule reels in advance"],
  alternates: { canonical: `${WEB_URL}/blog/how-to-schedule-instagram-reels` },
  openGraph: {
    title: "How to Schedule Instagram Reels in 2026 | Posthive",
    description: "Learn how to schedule Instagram Reels in advance and publish automatically at peak times.",
    url: `${WEB_URL}/blog/how-to-schedule-instagram-reels`,
    images: [{ url: "/api/og?layout=post&title=How+to+Schedule+Instagram+Reels&desc=Step-by-step+guide+for+2026&badge=Guide&date=July+7%2C+2026", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Schedule Instagram Reels in 2026 | Posthive",
    description: "Learn how to schedule Instagram Reels in advance and publish automatically at peak times.",
  },
};

const CALLOUT_TONE = {
  brand: "border-brand-300 bg-brand-100",
  danger: "border-red-200 bg-red-50",
  neutral: "border-border bg-surface",
};

function Callout({ children, tone = "brand" }: { children: React.ReactNode; tone?: keyof typeof CALLOUT_TONE }) {
  return (
    <div className={cn("my-8 rounded-xl border px-5 py-4", CALLOUT_TONE[tone])}>
      {children}
    </div>
  );
}

function StepCard({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="card flex gap-4 p-5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent type-body-sb-xs text-accent-fg">
        0{n}
      </div>
      <div>
        <p className="mb-2 type-body-sb-m text-fg">{title}</p>
        <p className="type-body-r-s text-muted">{desc}</p>
      </div>
    </div>
  );
}

export default function HowToScheduleInstagramReelsPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <SiteNav />

      <div className="mx-auto max-w-170 px-6 pt-14 pb-24">

        <BlogPostHeader
          category="Guide"
          date="July 7, 2026"
          readTime="8 min read"
          title="How to Schedule Instagram Reels in 2026 (Step-by-Step Guide)"
        />

        <BlogCtaBanner />

        <div className="article-body">

          {/* Quick answer box — featured snippet target */}
          <div className="my-8 rounded-xl border border-brand-300 bg-brand-100 px-5 py-4">
            <p className="section-label mb-2 text-brand-800">Quick answer</p>
            <p className="type-body-r-m text-fg">
              <strong>Yes, you can schedule Instagram Reels.</strong> Use a third-party tool like Posthive or Meta Business Suite. You need an Instagram Business or Creator account (personal accounts are not supported). Upload your MP4, write your caption, pick a time — the tool publishes automatically.
            </p>
          </div>

          <p>
            Scheduling Instagram Reels is one of the highest-leverage habits a creator can build. Reels are the single fastest way to grow on Instagram right now, but they only work consistently if you post at the right times and maintain a regular cadence. Most creators miss both because they rely on posting manually.
          </p>

          <p>
            This guide covers everything you need to know: whether scheduling Reels is possible, which tools support it, the exact steps to do it in Posthive, and the best times to post for maximum reach.
          </p>

          <h2>
            Can you schedule Instagram Reels?
          </h2>

          <p>
            Yes. Instagram supports Reel scheduling through its official Content Publishing API. Third-party tools like Posthive use this API to schedule Reels on your behalf. You upload your video, write your caption, pick a time, and the tool publishes it automatically at that exact moment.
          </p>

          <h3>
            Can you schedule reels on Instagram in advance?
          </h3>

          <p>
            Yes — you can schedule Instagram Reels days or weeks in advance. There is no limit on how far ahead you can schedule. Most creators batch-record a week of content and schedule all of it in one session, then let the tool publish automatically each day.
          </p>

          <p>
            There is one requirement: your Instagram account must be set to Business or Creator mode. Personal accounts are not supported by the API. Switching is free and takes under a minute in your Instagram settings.
          </p>

          <Callout tone="danger">
            <p className="mb-1.5 type-body-sb-s text-red-600">Account requirement</p>
            <p className="type-body-r-s text-fg">
              Only Instagram Business and Creator accounts can schedule Reels via the API. Go to Instagram Settings, tap Account, then Switch to Professional Account to upgrade for free.
            </p>
          </Callout>

          <h2>
            Why scheduling Reels matters
          </h2>

          <p>
            The Instagram algorithm distributes Reels based on early engagement signals. If you post when your audience is not online, your Reel gets poor early engagement, and the algorithm limits its reach. Scheduling lets you consistently hit peak times without having to be at your phone.
          </p>

          <div className="my-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { title: "Post at peak hours", desc: "Schedule during 9am-11am and 6pm-9pm when your audience is most active, without being online yourself." },
              { title: "Batch your content", desc: "Film and edit a week of Reels in one session, then schedule them to publish daily. One hour of work, seven days of content." },
              { title: "Stay consistent", desc: "The algorithm rewards creators who post regularly. Scheduling makes consistency automatic instead of a daily decision." },
              { title: "Cross-post alongside", desc: "Posthive lets you schedule your Reel on Instagram while simultaneously posting to Bluesky, LinkedIn, and Threads." },
            ].map((item) => (
              <div key={item.title} className="card p-5">
                <p className="mb-2 type-body-sb-m text-fg">{item.title}</p>
                <p className="type-body-r-s text-muted">{item.desc}</p>
              </div>
            ))}
          </div>

          <h2>
            How to schedule Instagram Reels with Posthive
          </h2>

          <p>
            Posthive supports Instagram Reels, Stories, carousels, and feed posts all from the same composer. Here is the exact process:
          </p>

          <div className="mb-8 flex flex-col gap-3">
            <StepCard n={1} title="Create your Posthive account" desc="Sign up at posthive.co. The 14-day free trial includes full Instagram scheduling support. No credit card required." />
            <StepCard n={2} title="Connect your Instagram account" desc="Go to Accounts in the sidebar. Click Connect Instagram and follow the Meta OAuth flow. Posthive will ask for publishing permissions. This takes about 60 seconds." />
            <StepCard n={3} title="Open the Compose page" desc="Click Compose in the sidebar. Select your Instagram account from the platform picker at the top of the composer." />
            <StepCard n={4} title="Select Reel as the content type" desc="Below the platform selector, you will see content type options: Feed Post, Reel, Story, Carousel. Select Reel. An upload area will appear for your video file." />
            <StepCard n={5} title="Upload your Reel video" desc="Drag and drop your MP4 file or click to browse. Instagram requires MP4 format, between 3 seconds and 15 minutes, with 9:16 aspect ratio recommended for best presentation." />
            <StepCard n={6} title="Write your caption" desc="Write your caption in the text area. If you want to use hashtags without cluttering your caption, add them in the First Comment field below. Posthive posts the comment automatically right after the Reel goes live." />
            <StepCard n={7} title="Set your publish time" desc="Click the date and time picker and choose when you want the Reel to go live. Posthive handles the rest." />
            <StepCard n={8} title="Schedule" desc="Click Schedule. Your Reel appears on the content calendar. At the exact time you chose, Posthive publishes it through the Instagram API automatically." />
          </div>

          <Callout tone="brand">
            <p className="mb-1.5 type-body-sb-s text-brand-800">Pro tip: First comment for hashtags</p>
            <p className="type-body-r-s text-fg">
              Putting hashtags in the first comment instead of the caption keeps your caption clean and readable. Research suggests this can improve save rates because the caption looks less cluttered. Posthive posts the first comment automatically within seconds of the Reel going live.
            </p>
          </Callout>

          <Callout tone="neutral">
            <p className="mb-1.5 type-body-sb-s text-fg">Scheduling carousels too?</p>
            <p className="type-body-r-s text-muted">
              If you're also scheduling Instagram carousels, you'll need to design your <a href="https://carouselpost.io/">multi-slide posts</a> before uploading them to Posthive. CarouselPost has a free browser-based generator that turns a prompt into a finished set of slides — useful if you don't have a design tool in your workflow.
            </p>
          </Callout>

          <h2>
            How to schedule Instagram Reels with Meta Business Suite
          </h2>

          <p>
            Meta Business Suite has a built-in scheduling tool for Reels. It is free and does not require a third-party account. Here is how it works:
          </p>

          <ol>
            {[
              "Go to business.facebook.com and connect your Instagram account.",
              "Click Create Post in the left sidebar.",
              "Select Instagram in the platform selector.",
              "Upload your video and toggle the Reel format.",
              "Write your caption.",
              "Click the arrow next to Publish and select Schedule.",
              "Pick your date and time, then confirm.",
            ].map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          <p>
            The limitation with Meta Business Suite is that it only covers Instagram and Facebook. If you post on Bluesky, LinkedIn, Threads, or any other platform, you will need a separate workflow for those. Posthive covers multiple platforms from one composer.
          </p>

          <h2>
            How to schedule Instagram Reels for free
          </h2>

          <p>
            There are two ways to schedule Instagram Reels without paying anything:
          </p>

          <div className="mb-8 flex flex-col gap-3">
            <div className="card p-5">
              <p className="mb-2 type-body-sb-m text-fg">Option 1 — Posthive free trial</p>
              <p className="type-body-r-s text-muted">
                Posthive includes a 14-day free trial with full Instagram Reels scheduling support, no credit card required. You get access to Reels, Stories, carousels, and feed posts, plus cross-posting to Bluesky, Threads, and LinkedIn from the same composer.
              </p>
            </div>
            <div className="card p-5">
              <p className="mb-2 type-body-sb-m text-fg">Option 2 — Meta Business Suite (permanently free)</p>
              <p className="type-body-r-s text-muted">
                Meta Business Suite is free and lets you schedule Reels natively without a third-party account. The trade-off is that it only works for Instagram and Facebook — no other platforms, no bulk scheduling, and no content calendar across accounts.
              </p>
            </div>
          </div>

          <h2>
            Instagram Reels scheduler comparison
          </h2>

          <p>
            Not all schedulers handle Instagram Reels the same way. Here is how the main options compare:
          </p>

          <div className="mb-8 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  {["Feature", "Posthive", "Meta Business Suite", "Buffer", "Later"].map((h) => (
                    <th key={h} className={cn("whitespace-nowrap", h === "Posthive" && "text-brand-800")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Schedule Reels", "✓", "✓", "✓", "✓"],
                  ["Schedule Stories", "✓", "✓", "✗", "✓"],
                  ["Carousel scheduling", "✓", "✓", "✓", "✓"],
                  ["First comment scheduling", "✓", "✗", "✗", "✗"],
                  ["Cross-platform posting", "✓ (14 platforms)", "Facebook only", "✓ (6 platforms)", "✓ (6 platforms)"],
                  ["Bulk CSV scheduling", "✓", "✗", "✗", "✗"],
                  ["Open source / self-host", "✓", "✗", "✗", "✗"],
                  ["Free tier", "14-day trial", "Free forever", "Free (3 channels)", "Free (1 channel)"],
                  ["Paid plans from", "$7/mo", "Free", "$6/mo", "$18/mo"],
                ].map(([feature, ...vals]) => (
                  <tr key={feature as string}>
                    <td className="text-fg">{feature as string}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={cn(v === "✗" ? "text-neutral-400" : v === "✓" ? "text-green-700" : i === 0 ? "text-brand-800" : "text-muted")}>{v as string}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>
            Best times to post Instagram Reels
          </h2>

          <p>
            Timing matters because Instagram uses early engagement (views, likes, shares in the first 30-60 minutes) to decide how widely to distribute a Reel. Posting when your audience is not active means fewer early signals, which means less distribution.
          </p>

          <div className="mb-8 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Best times</th>
                  <th>Notes</th>
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
                  <tr key={day as string}>
                    <td className="text-fg">{day as string}</td>
                    <td className="text-brand-800 tabular-nums">{times as string}</td>
                    <td className="text-muted">{note as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            These are general benchmarks. Your specific audience may differ. Check your Instagram Insights after 4-6 weeks of consistent posting to see when your followers are most active, then adjust your schedule accordingly.
          </p>

          <h2>
            Instagram Reels specifications for scheduling
          </h2>

          <div className="mb-8 flex flex-col">
            {[
              { label: "Format", value: "MP4 or MOV" },
              { label: "Aspect ratio", value: "9:16 recommended (vertical). 4:5 and 1:1 also supported" },
              { label: "Resolution", value: "1080 x 1920px recommended" },
              { label: "Duration", value: "3 seconds to 15 minutes" },
              { label: "File size", value: "Up to 1GB" },
              { label: "Frame rate", value: "23-60fps" },
              { label: "Audio", value: "AAC, max 128kbps" },
            ].map((row) => (
              <div key={row.label} className="flex gap-4 border-b border-border py-2.5">
                <span className="w-30 shrink-0 type-body-sb-s text-muted">{row.label}</span>
                <span className="type-body-r-s text-fg">{row.value}</span>
              </div>
            ))}
          </div>

          <h2>
            Does scheduling Instagram Reels affect views?
          </h2>

          <p>
            No. Scheduling a Reel through a Meta-approved tool does not hurt your reach or views. The Reel is published via the official Instagram Content Publishing API — Instagram cannot distinguish between a scheduled post and one posted manually.
          </p>

          <p>
            The myth that scheduling reduces reach comes from the early days of third-party tools that used unofficial workarounds. Modern schedulers like Posthive use the official API, which Meta explicitly supports for business accounts.
          </p>

          <h2>
            How many Reels can you schedule on Instagram?
          </h2>

          <p>
            There is no hard limit on how many Reels you can schedule. The Instagram Content Publishing API allows up to 50 publish calls per 24 hours per account. Posting 1–3 Reels per day is well within limits and considered normal usage. Scheduling dozens per day is technically possible but not recommended — Instagram may flag unusually high posting frequency as spam.
          </p>

          <h2>
            Can I schedule Instagram Reels using Creator Studio?
          </h2>

          <p>
            Instagram Creator Studio was Meta&apos;s original desktop publishing tool. As of 2024, Meta has retired Creator Studio and migrated its features into <strong>Meta Business Suite</strong> (business.facebook.com). If you are searching for Creator Studio Reels scheduling, Meta Business Suite is now the equivalent native option.
          </p>

          <p>
            Meta Business Suite lets you schedule Reels natively for free. The trade-off: it only covers Instagram and Facebook. For scheduling Reels alongside posts on Bluesky, LinkedIn, Threads, or other platforms, you need a third-party tool like Posthive.
          </p>

          <h2>
            Where to find your scheduled Reels on Instagram
          </h2>

          <p>
            Instagram does not show scheduled Reels inside the app itself. There is no &ldquo;Scheduled&rdquo; tab in the Instagram mobile app. To see your scheduled Reels, check the tool you used to schedule them:
          </p>

          <div className="mb-8 flex flex-col gap-3">
            {([
              { tool: "Posthive", where: "Go to Posts in the sidebar, or switch the Jobs page to calendar view. All scheduled Reels appear with their publish time. Drag them to reschedule." },
              { tool: "Meta Business Suite", where: "Go to business.facebook.com → Planner tab. Scheduled Reels appear on the content calendar under your Instagram account." },
              { tool: "Buffer", where: "Open the Queue tab for your Instagram channel. Scheduled Reels appear in chronological order." },
              { tool: "Later", where: "Go to the Calendar view in Later. Scheduled Reels appear as tiles on the publish date." },
            ] as { tool: string; where: string }[]).map((row) => (
              <div key={row.tool} className="card p-5">
                <p className="mb-2 type-body-sb-m text-fg">{row.tool}</p>
                <p className="type-body-r-s text-muted">{row.where}</p>
              </div>
            ))}
          </div>

          <p>
            Once a scheduled Reel is published, it appears on your Instagram profile like any other Reel — no indicator that it was scheduled.
          </p>

          <h2>
            Frequently asked questions
          </h2>

          <div className="mb-8 flex flex-col gap-3">
            {faqSchema.mainEntity.map((item) => (
              <div key={item.name} className="card p-5">
                <p className="mb-2 type-body-sb-m text-fg">{item.name}</p>
                <p className="type-body-r-s text-muted">{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>

          <div className="card mt-12 p-8 text-center">
            <p className="mb-2 type-head-sb-5 text-fg">Start scheduling Instagram Reels today</p>
            <p className="mb-6 type-body-r-s text-muted">14-day free trial. No credit card required. Connect your Instagram account in under a minute.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-primary px-6 py-3">
                Get started free
              </Link>
              <Link href="/features/instagram-reels-scheduler" className="btn-secondary px-6 py-3">
                See Instagram features
              </Link>
            </div>
          </div>

          {/* Related reading */}
          <div className="mt-12 border-t border-border pt-9">
            <p className="section-label mb-4">Related reading</p>
            <div className="flex flex-col gap-3">
              {[
                { href: "/platforms/instagram", label: "Instagram scheduler: Reels, Stories, carousels, and feed posts" },
                { href: "/blog/best-social-media-scheduler", label: "The best social media schedulers in 2026 compared" },
                { href: "/blog/canva-social-media-scheduler-alternative", label: "Canva social media scheduler alternative" },
                { href: "/platforms/facebook", label: "Keep your Facebook Page active on autopilot" },
                { href: "/platforms/youtube", label: "Schedule YouTube Shorts without opening YouTube Studio" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="flex items-center gap-2 type-body-r-s text-brand-800 transition-colors hover:text-brand-900">
                  <span className="text-neutral-400">→</span> {label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      <footer className="border-t border-border px-6 py-10 text-center">
        <div className="mb-4 flex flex-wrap justify-center gap-6">
          {([["Privacy", "/privacy"], ["Terms", "/terms"], ["Docs", "/docs"], ["Pricing", "/pricing"], ["Blog", "/blog"]] as [string, string][]).map(([label, href]) => (
            <Link key={label} href={href} className="type-body-r-s text-muted transition-colors hover:text-fg">{label}</Link>
          ))}
        </div>
        <p className="type-body-r-xs text-muted">© {new Date().getFullYear()} Posthive · AGPL-3.0</p>
      </footer>
    </div>
  );
}
