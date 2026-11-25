import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Use only after verifying the signed-in user's admin role on the server.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Supabase server secret is not configured.");
  return createSupabaseClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}
