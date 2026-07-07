export default {
  // TypeScript check for API — run whole project (tsc doesn't accept individual files)
  "apps/api/src/**/*.{ts,tsx}": () => "pnpm --filter api typecheck",

  // TypeScript check for Web
  "apps/web/src/**/*.{ts,tsx}": () => "pnpm --filter web typecheck",
};
