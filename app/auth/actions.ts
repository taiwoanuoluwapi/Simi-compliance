"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email().max(254);
const passwordSchema = z.string().min(10).max(128);

export async function signIn(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!email.success || !password.success) redirect("/login?error=invalid");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: password.data });
  if (error) redirect("/login?error=credentials");
  redirect("/account");
}

export async function signUp(formData: FormData) {
  const name = z.string().trim().min(2).max(100).safeParse(formData.get("full_name"));
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!name.success || !email.success || !password.success) redirect("/register?error=invalid");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: { data: { full_name: name.data } },
  });
  if (error) redirect("/register?error=signup");
  redirect("/login?message=check-email");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
