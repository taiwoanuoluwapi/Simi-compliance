import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/login");
  return { supabase, userId };
}

export async function requireStaff() {
  const { supabase, userId } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (!profile || !["staff", "admin"].includes(profile.role)) redirect("/account");
  return { supabase, userId, role: profile.role };
}
