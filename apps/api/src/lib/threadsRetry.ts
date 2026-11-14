// Threads publishes in two steps: create a container, then publish it. Right after creation Meta
// sometimes hasn't registered the container yet and the publish fails with code 24, subcode
// 4279009 ("The media with ID ... cannot be found"). Waiting a few seconds and publishing again works.
export function isContainerNotReady(message: string): boolean {
  return message.includes('"code":24') && message.includes('"error_subcode":4279009');
}

// Runs fn, and runs it again after delayMs while shouldRetry(error) is true, up to `attempts` runs.
// Any other error, or the last failed run, is thrown as it is.
export async function retry<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
  attempts = 3,
  delayMs = 3000,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= attempts || !shouldRetry(error)) throw error;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
