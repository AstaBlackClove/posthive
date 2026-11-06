"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { cn } from "../../lib/cn";
import { Wordmark } from "../Wordmark";
import { PlanArt, PublishArt, ReviewArt } from "./AuthSlideArt";

interface Slide {
  id: string;
  /** One entry per line, so the break matches the design at any width. */
  title: string[];
  subtitle: string;
  Art: ComponentType;
}

export const AUTH_SLIDES: Slide[] = [
  {
    id: "plan",
    title: ["Good Content Helps", "You Grow & Glow."],
    subtitle: "Plan every Instagram & LinkedIn post in one calendar.",
    Art: PlanArt,
  },
  {
    id: "review",
    title: ["Review Together,", "Ship Faster."],
    subtitle: "Captions, comments and approvals — no more chasing on chat.",
    Art: ReviewArt,
  },
  {
    id: "publish",
    title: ["Publish on Time,", "See What Works."],
    subtitle: "Schedule once, then track results per channel.",
    Art: PublishArt,
  },
];

const INTERVAL_MS = 6000;

/** Left panel of the auth screens: three product slides that crossfade. */
export function AuthSlider({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Keyed on `index`, so a manual pick restarts the timer.
  useEffect(() => {
    if (paused || reducedMotion) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % AUTH_SLIDES.length), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, paused, reducedMotion]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What you can do"
      className={cn("flex h-full flex-col px-8 pt-16 pb-11 text-neutral-700", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="grid flex-1 grid-rows-[minmax(0,1fr)]">
        {AUTH_SLIDES.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${AUTH_SLIDES.length}`}
              aria-hidden={!active}
              className={cn(
                "col-start-1 row-start-1 flex min-h-0 flex-col transition-opacity duration-500 motion-reduce:transition-none",
                active ? "opacity-100" : "opacity-0",
              )}
            >
              <h2 className="type-display-m-6 min-[1280px]:type-display-m-4 min-[1440px]:type-display-m-3">
                {s.title.map((line, n) => (
                  <span key={line}>
                    {n > 0 && <br />}
                    {line}
                  </span>
                ))}
              </h2>
              <p className="mt-4 max-w-120 type-body-r-m">{s.subtitle}</p>
              <div className="flex flex-1 items-center pl-7">
                <div className="origin-left scale-75 xl:scale-100">
                  <s.Art />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-12 flex items-center gap-2.25">
        {AUTH_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Show slide ${i + 1} of ${AUTH_SLIDES.length}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              "relative h-2 cursor-pointer rounded-full transition-all duration-300 after:absolute after:-inset-2 motion-reduce:transition-none",
              i === index ? "w-7 bg-neutral-700" : "w-2 bg-neutral-700/30 hover:bg-neutral-700/50",
            )}
          />
        ))}
      </div>

      <Wordmark size="lg" />
    </section>
  );
}
