export interface ShutdownDeps {
  /** Stops taking new jobs and resolves once the jobs already running have finished. */
  closeWorker: () => Promise<void>;
  /** Gives up on running jobs. Only used when the wait runs past the time limit. */
  forceCloseWorker: () => Promise<void>;
  /** Stops taking new HTTP requests and lets the ones in flight finish. */
  closeServer?: () => Promise<void>;
  /** Closes the database. Always runs last, after anything that might still use it. */
  closeDb: () => Promise<void>;
  /** How long to wait for running work before giving up. Default 45 s. */
  timeoutMs?: number;
  log?: (message: string) => void;
}

// A deploy stops the old server with SIGTERM. Quitting at once cuts off any post being sent,
// which leaves its job stuck as "running". Instead: stop taking new work, let what is running
// finish (up to a time limit), then close the database and exit.
export async function gracefulShutdown(deps: ShutdownDeps): Promise<"clean" | "forced"> {
  const { closeWorker, forceCloseWorker, closeServer, closeDb, timeoutMs = 45_000, log = () => {} } = deps;

  log("[shutdown] waiting for running jobs and requests to finish");

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  const drained = Promise.all([closeWorker(), closeServer?.()]).then(() => "drained" as const);

  const outcome = await Promise.race([drained, timedOut]);
  if (timer) clearTimeout(timer);

  if (outcome === "timeout") {
    log(`[shutdown] still busy after ${timeoutMs / 1000}s, forcing the worker closed`);
    await forceCloseWorker().catch((err) => log(`[shutdown] force close failed: ${String(err)}`));
  }

  await closeDb().catch((err) => log(`[shutdown] database close failed: ${String(err)}`));
  log(`[shutdown] done (${outcome === "timeout" ? "forced" : "clean"})`);

  return outcome === "timeout" ? "forced" : "clean";
}
