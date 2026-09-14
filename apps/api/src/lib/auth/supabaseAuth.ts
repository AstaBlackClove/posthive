import { createClient } from "@supabase/supabase-js";
import { prisma } from "../prisma.js";
import type { AuthProvider, AuthUser } from "./types.js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Service role client — admin operations (create/delete users)
const adminClient = () => createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client with a user's access token — validates JWT
const userClient = (accessToken: string) => createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: `Bearer ${accessToken}` } },
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertLocalUser(supabaseId: string, email: string, name: string, avatarUrl?: string): Promise<AuthUser> {
  const existing = await prisma.user.findUnique({ where: { supabaseId } });
  if (existing) {
    const updated = await prisma.user.update({
      where: { supabaseId },
      data: { email, name, avatarUrl: avatarUrl ?? null },
    });
    // Guard: ensure workspace exists (backfill for users created before workspace feature)
    if (!updated.activeWorkspaceId) {
      const hasMembership = await prisma.workspaceMember.findFirst({ where: { userId: updated.id } });
      if (!hasMembership) {
        const workspace = await prisma.workspace.create({
          data: {
            name: `${name}'s Workspace`,
            plan: "trialing",
            planStatus: "trialing",
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            members: { create: { userId: updated.id, role: "owner" } },
          },
        });
        await prisma.user.update({ where: { id: updated.id }, data: { activeWorkspaceId: workspace.id } });
        updated.activeWorkspaceId = workspace.id;
      }
    }
    return { id: updated.id, email: updated.email, name: updated.name, avatarUrl: updated.avatarUrl, timezone: updated.timezone ?? "UTC" };
  }

  // New user — create with workspace in one go
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const user = await prisma.user.create({ data: { email, name, supabaseId, avatarUrl: avatarUrl ?? null } });
  const workspace = await prisma.workspace.create({
    data: {
      name: `${name}'s Workspace`,
      plan: "trialing",
      planStatus: "trialing",
      trialEndsAt,
      members: { create: { userId: user.id, role: "owner" } },
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { activeWorkspaceId: workspace.id } });

  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, timezone: user.timezone ?? "UTC" };
}

export const supabaseAuthProvider: AuthProvider = {
  async register(email, password, name) {
    const { data, error } = await adminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Registration failed");

    // Sign in to get session tokens
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: session, error: signInError } = await anonClient.auth.signInWithPassword({ email, password });
    if (signInError || !session.session) throw new Error(signInError?.message ?? "Login after register failed");

    const user = await upsertLocalUser(data.user.id, email, name);
    return {
      user,
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
    };
  },

  async login(email, password) {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message ?? "Invalid email or password");

    const name = data.user.user_metadata?.name ?? email.split("@")[0];
    const user = await upsertLocalUser(data.user.id, email, name);
    return {
      user,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  async validateAccessToken(token) {
    const { data, error } = await userClient(token).auth.getUser();
    if (error || !data.user) return null;

    const user = await prisma.user.findUnique({ where: { supabaseId: data.user.id } });
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, timezone: user.timezone ?? "UTC" };
  },

  async refreshTokens(refreshToken) {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await anonClient.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return null;
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  async logout(refreshToken) {
    // Supabase logout via access token — best effort
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await anonClient.auth.setSession({ access_token: refreshToken, refresh_token: refreshToken });
    await anonClient.auth.signOut();
  },
};
