"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-user";

const schema = z.object({
  request_id: z.string().uuid(),
  status: z.enum(["submitted", "under_review", "awaiting_information", "processing", "completed", "cancelled"]),
  staff_note: z.string().trim().max(2000).optional(),
  documents_requested: z.enum(["on", "off"]).optional(),
});

export async function updateServiceRequest(formData: FormData) {
  const parsed = schema.safeParse({
    request_id: formData.get("request_id"),
    status: formData.get("status"),
    staff_note: formData.get("staff_note") ?? "",
    documents_requested: formData.get("documents_requested") ?? "off",
  });
  if (!parsed.success) redirect("/admin?error=invalid");
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("service_requests").update({
    status: parsed.data.status,
    staff_note: parsed.data.staff_note || null,
    documents_requested: parsed.data.documents_requested === "on",
    updated_at: new Date().toISOString(),
  }).eq("id", parsed.data.request_id);
  if (error) redirect("/admin?error=update");
  revalidatePath("/admin");
  revalidatePath("/account");
  revalidatePath(`/account/requests/${parsed.data.request_id}`);
  redirect("/admin?updated=1");
}
