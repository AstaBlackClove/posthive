import type { ReactNode } from "react";
import Link from "next/link";
import { BRAND } from "../../lib/brand";
import { AuthSlider } from "./AuthSlider";

type Props = {
  children: ReactNode;
  /** Which link the top-right pill shows. Login-type screens offer sign up; register offers log in. */
  cta?: "signup" | "login";
  returnTo?: string | null;
};

/** Shared frame for login, register, forgot and reset: product slides on the left, form panel on the right. */
export function AuthShell({ children, cta = "signup", returnTo }: Props) {
  const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  const link =
    cta === "signup"
      ? { prompt: `New to ${BRAND.name}?`, label: "Sign up", href: `/register${qs}` }
      : { prompt: "Already have an account?", label: "Log in", href: `/login${qs}` };

  return (
    // min-h-screen: the page is exactly one screen tall when the form fits, so no scrolling to reach the button.
    // dvh on small screens, where 100vh includes the browser toolbar.
    <div className="min-h-screen bg-brand-500 max-lg:min-h-dvh lg:grid lg:grid-cols-[46fr_54fr]">
      <aside className="hidden min-w-0 lg:block">
        <AuthSlider />
      </aside>

      <main className="relative flex min-h-screen flex-col bg-neutral-700 text-white max-lg:min-h-dvh lg:my-3 lg:mr-3 lg:min-h-0 lg:rounded-2xl">
        {/* Absolute so the form centres on the whole panel, like the design */}
        <header className="absolute inset-x-0 top-0 flex items-center justify-end gap-4 px-6 pt-6">
          <div className="flex items-center gap-3">
            <span className="hidden type-body-r-s text-neutral-200 sm:inline">{link.prompt}</span>
            <Link
              href={link.href}
              className="inline-flex h-9 items-center rounded-full bg-white px-4 type-body-sb-s text-neutral-950 transition-colors hover:bg-brand-100"
            >
              {link.label}
            </Link>
          </div>
        </header>

        {/* 120px side padding from xl up, same on every auth screen. Wider screens stop at max-w-146 and stay centred. */}
        <div className="flex flex-1 items-center justify-center px-6 pt-20 pb-8 lg:px-16 xl:px-30 short:pt-16 short:pb-6">
          <div className="w-full max-w-146 space-y-7 short:space-y-5">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Title + one-line subtitle. Drops to a single title line on short screens. */
export function AuthHeading({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div>
      <h1 className="type-head-r-3 sm:type-head-r-1 short:sm:type-head-r-3">{title}</h1>
      {subtitle && <p className="mt-4 type-body-r-xs text-neutral-200 short:mt-2">{subtitle}</p>}
    </div>
  );
}
