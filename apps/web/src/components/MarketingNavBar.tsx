"use client";

import { useAuth } from "../context/AuthContext";
import { NavBar } from "./LandingNav";

export function MarketingNavBar() {
  const { user, loading } = useAuth();
  return (
    <NavBar
      user={!!user}
      loading={loading}
      ctaHref={user ? "/compose" : "/register"}
      navCtaLabel={user ? "Go to app" : "Get started free"}
    />
  );
}
