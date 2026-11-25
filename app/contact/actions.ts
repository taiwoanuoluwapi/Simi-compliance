"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const enquirySchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional(),
  service_interest: z.string().trim().max(120).optional(),
  message: z.string().trim().min(5).max(2000),
});

export async function submitContactEnquiry(formData: FormData) {
  // Honeypot: real visitors leave this hidden field empty.
  if (String(formData.get("website") ?? "").trim()) redirect("/contact?sent=1");
  const parsed = enquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/contact?error=invalid");
  const supabase = await createClient();
  const { error } = await supabase.from("contact_enquiries").insert(parsed.data);
  if (error) redirect("/contact?error=submit");
  redirect("/contact?sent=1");
}
