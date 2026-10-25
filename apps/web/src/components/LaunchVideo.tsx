"use client";

import { useEffect, useRef, useState } from "react";

const R2 = "https://pub-3d086e1182384cb5a8b0b360696831bc.r2.dev/posthive-landingpage";

export function LaunchVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) ref.current?.pause();
  }, []);

  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !muted;
    // turning sound on restarts from the top so the voiceover is heard from the hook
    if (muted) {
      v.currentTime = 0;
      v.play();
    }
    setMuted(!muted);
  };

  return (
    <div style={{ position: "relative" }}>
      <video
        ref={ref}
        suppressHydrationWarning
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={`${R2}/posthive-launch-poster.webp`}
        aria-label="Posthive product video: write a post once and schedule it to 14 social networks"
        style={{ width: "100%", height: "auto", aspectRatio: "16 / 9", display: "block", background: "#0a0a0a" }}
      >
        <source src={`${R2}/posthive-launch-720p.mp4`} type="video/mp4" media="(max-width: 768px)" />
        <source src={`${R2}/posthive-launch-1080p.mp4`} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={!muted}
        className="hover:bg-gray-100"
        style={{
          position: "absolute",
          right: 16,
          top: 16,
          padding: "8px 14px",
          borderRadius: 999,
          border: "none",
          backgroundColor: "#ffffff",
          color: "#0a0a0a",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,.4)",
        }}
      >
        {muted ? "Play with sound" : "Mute"}
      </button>
    </div>
  );
}
