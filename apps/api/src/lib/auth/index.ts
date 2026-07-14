import type { AuthProvider } from "./types.js";

const provider = process.env.AUTH_PROVIDER ?? "local";

// Dynamic import so @supabase/supabase-js is never loaded when AUTH_PROVIDER=local.
// @supabase/realtime-js v2.10+ throws on Node <22 if WebSocket is absent — even
// when Realtime is unused — because RealtimeClient is constructed inside createClient().
let _authProvider!: AuthProvider;
if (provider === "supabase") {
  const { supabaseAuthProvider } = await import("./supabaseAuth.js");
  _authProvider = supabaseAuthProvider;
} else {
  const { localAuthProvider } = await import("./localAuth.js");
  _authProvider = localAuthProvider;
}

export const authProvider: AuthProvider = _authProvider;
export type { AuthUser, TokenPair } from "./types.js";
