import type { AuthProvider } from "./types.js";
import { localAuthProvider } from "./localAuth.js";
import { supabaseAuthProvider } from "./supabaseAuth.js";

const provider = process.env.AUTH_PROVIDER ?? "local";

export const authProvider: AuthProvider =
  provider === "supabase" ? supabaseAuthProvider : localAuthProvider;

export type { AuthUser, TokenPair } from "./types.js";
