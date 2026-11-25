"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function submitServiceRequest(formData: FormData) {
  const slug = z.string().min(2).max(120).safeParse(formData.get("service_slug"));
  const note = z.string().trim().max(2000).safeParse(formData.get("customer_note") ?? "");
  if (!slug.success || !note.success) redirect("/services?error=request");
  const supabase = await createClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (authError || !userId) redirect("/login");
  const { data: service } = await supabase.from("services").select("id, fulfilment_type").eq("slug", slug.data).eq("is_active", true).single();
  if (!service) redirect("/services?error=service");
  const { data, error } = await supabase.from("service_requests").insert({ customer_id: userId, service_id: service.id, customer_note: note.data || null }).select("reference_code").single();
  if (error || !data) redirect("/services?error=submit");
  redirect(`/account?submitted=${encodeURIComponent(data.reference_code)}`);
}
