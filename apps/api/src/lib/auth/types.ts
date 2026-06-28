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

export interface AuthProvider {
  register(email: string, password: string, name: string): Promise<{ user: AuthUser } & TokenPair>;
  login(email: string, password: string): Promise<{ user: AuthUser } & TokenPair>;
  validateAccessToken(token: string): Promise<AuthUser | null>;
  refreshTokens(refreshToken: string): Promise<TokenPair | null>;
  logout(refreshToken: string): Promise<void>;
}
