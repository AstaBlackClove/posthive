/**
 * Detects a dead OAuth token from a platform's raw error body, across the
 * different shapes each platform uses for "this token is dead, reconnect":
 *   - Meta (Facebook/Instagram/Threads): {"error":{"code":190,"type":"OAuthException",...}}
 *   - Pinterest: {"code":283,"message":"The authorization grant is invalid"}
 *   - OAuth2 standard: "invalid_grant"
 *   - LinkedIn (our app never gets a refresh token at all — not a true revocation,
 *     but the same remedy: reconnect): "LinkedIn refresh token missing"
 */
export function isDeadTokenError(body: string): boolean {
  return (
    body.includes("invalid_grant") ||
    body.includes("reconnect required") ||
    body.includes('"code":190') ||
    body.includes('"code": 190') ||
    body.includes('"code":283') ||
    body.includes('"code": 283') ||
    body.includes("LinkedIn refresh token missing")
  );
}
