import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center gap-4 bg-bg px-6 py-10 text-center">
      <div className="type-display-m-3 text-neutral-200">404</div>
      <div className="type-body-m-l text-fg">Page not found</div>
      <div className="max-w-80 type-body-r-s text-muted">
        The page you're looking for doesn't exist or has been moved.
      </div>
      <Link
        href="/compose"
        className="btn-primary mt-2 rounded-lg px-5 py-2.5"
      >
        Go to Compose
      </Link>
    </div>
  );
}
