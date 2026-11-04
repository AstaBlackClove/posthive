export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
  /** null = keep the refresh cookie the client already has (rotation grace window). */
  refreshToken: string | null;
}

export interface AuthProvider {
  register(email: string, password: string, name: string): Promise<{ user: AuthUser } & TokenPair>;
  login(email: string, password: string): Promise<{ user: AuthUser } & TokenPair>;
  /** `sessionId` is set by providers with server-side sessions (local). */
  validateAccessToken(token: string): Promise<(AuthUser & { sessionId?: string }) | null>;
  refreshTokens(refreshToken: string): Promise<RefreshResult | null>;
  logout(refreshToken: string, sessionId?: string): Promise<void>;
  /** Revoke every session of the user, optionally keeping one. Not supported by all providers. */
  revokeOtherSessions?(userId: string, keepSessionId?: string): Promise<void>;
}
