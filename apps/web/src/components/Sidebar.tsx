"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { TrialBanner } from "./TrialBanner";
import { useToast } from "./Toast";

const NAV = [
  {
    href: "/compose",
    label: "Compose",
    icon: (
      <svg
        className="w-5 h-5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    href: "/jobs",
    label: "Posts",
    icon: (
      <svg
        className="w-5 h-5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    href: "/accounts",
    label: "Accounts",
    icon: (
      <svg
        className="w-5 h-5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    href: "/billing",
    label: "Billing",
    icon: (
      <svg
        className="w-5 h-5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg
        className="w-5 h-5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { success, error } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  // Track viewport so collapse (icon-only) mode only applies on desktop —
  // the mobile drawer should always show full content regardless of the saved preference
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const showCollapsed = collapsed && isDesktop;

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="md:hidden fixed z-40 flex items-center justify-center"
        style={{
          top: 14,
          left: 14,
          width: 36,
          height: 36,
          borderRadius: 9,
          backgroundColor: "#161616",
          border: "1px solid #2a2a2a",
          color: "#ededed",
        }}
      >
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(0,0,0,.6)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        style={{
          backgroundColor: "var(--color-bg)",
          borderRight: "1px solid #2a2a2a",
        }}
        className={`fixed md:relative inset-y-0 left-0 z-50 flex flex-col shrink-0 h-full w-60 transition-transform duration-200 md:transition-all md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "md:w-[60px]" : "md:w-60"}`}
      >
      {/* Logo — fixed height 65px to match main content header */}
      <div
        className="flex items-center shrink-0 px-3 gap-2 relative"
        style={{ height: 65, borderBottom: "1px solid #2a2a2a" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/posthivemain.png"
            alt="Posthive"
            width={28}
            height={28}
            style={{ objectFit: "contain" }}
          />
          {!showCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight text-white">
                Posthive
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Toggle button — desktop only, floats at the right edge */}
      <button
        onClick={toggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden md:flex absolute z-10 items-center justify-center transition-colors hover:bg-white/10"
        style={{
          top: "50%",
          right: -12,
          transform: "translateY(-50%)",
          width: 24,
          height: 24,
          borderRadius: "50%",
          backgroundColor: "#1f1f2e",
          border: "1px solid #3a3a5a",
          color: "#818cf8",
        }}
      >
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d={showCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
          />
        </svg>
      </button>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={showCollapsed ? item.label : undefined}
              style={
                active
                  ? { backgroundColor: "var(--color-accent)", color: "#fff" }
                  : { color: "var(--color-muted)" }
              }
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                !active ? "hover:bg-white/5 hover:text-white" : ""
              } ${showCollapsed ? "justify-center" : ""}`}
            >
              {item.icon}
              {!showCollapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Email verification banner — hide when collapsed or already verified */}
      {!showCollapsed && user && !user.emailVerified && (
        <div className="mx-2 mb-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: "#1c1209", border: "1px solid #78560a" }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: "#fbbf24" }}>Verify your email</p>
          <p className="text-xs mb-2" style={{ color: "#888" }}>Check your inbox for a verification link.</p>
          <button
            onClick={async () => {
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/resend-verification`, {
                  method: "POST", credentials: "include",
                });
                if (res.ok) {
                  success("Verification email sent — check your inbox.");
                } else {
                  const data = await res.json().catch(() => ({}));
                  error(data.error ?? "Failed to send email. Try again.");
                }
              } catch {
                error("Failed to send email. Try again.");
              }
            }}
            className="text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ color: "#fbbf24" }}>
            Resend email
          </button>
        </div>
      )}

      {/* Trial banner — hide when collapsed */}
      {!showCollapsed && <TrialBanner />}

      {/* User footer */}
      <div className="px-2 py-3" style={{ borderTop: "1px solid #2a2a2a" }}>
        <div
          className={`flex items-center gap-3 px-2 py-2 rounded-lg ${showCollapsed ? "justify-center" : ""}`}
        >
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {initial}
            </div>
          )}
          {!showCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.name}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--color-muted)" }}
                >
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="transition-colors shrink-0 hover:text-red-400"
                style={{ color: "var(--color-muted)" }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
