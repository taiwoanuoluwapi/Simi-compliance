import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (authError || !userId) return NextResponse.json({ error: "Sign in to verify this payment." }, { status: 401 });
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference || reference.length > 100) return NextResponse.json({ error: "Payment reference is missing." }, { status: 400 });
  const { data: payment } = await supabase.from("payments").select("id, provider_reference, amount_kobo, currency, status").eq("provider_reference", reference).eq("customer_id", userId).single();
  if (!payment) return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
  if (payment.status === "successful") return NextResponse.json({ status: "success" });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.status) return NextResponse.json({ error: "Unable to verify payment with Paystack." }, { status: 502 });
  const transaction = payload.data;
  const admin = createAdminClient();
  if (transaction.status === "success" && Number(transaction.amount) === Number(payment.amount_kobo) && transaction.currency === payment.currency) {
    await admin.from("payments").update({ status: "successful", verified_at: new Date().toISOString() }).eq("provider_reference", reference);
    return NextResponse.json({ status: "success" });
  }
  if (["failed", "abandoned", "reversed"].includes(transaction.status)) {
    await admin.from("payments").update({ status: "failed" }).eq("provider_reference", reference);
    return NextResponse.json({ status: "failed" });
  }
  return NextResponse.json({ status: "pending" });
}
