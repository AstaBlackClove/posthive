import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started free",
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
