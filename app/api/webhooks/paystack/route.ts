import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";

function safeEqualHex(expected: string, received: string) {
  if (!/^[a-f0-9]{128}$/i.test(received)) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifySignature(rawBody: string, request: Request) {
  const modernHeader = request.headers.get("paystack-signature");
  const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (modernHeader && webhookSecret) {
    let timestamp: number | undefined;
    const signatures: string[] = [];
    for (const part of modernHeader.split(",")) {
      const [key, ...rest] = part.trim().split("=");
      const value = rest.join("=");
      if (key === "t" && /^\d+$/.test(value)) timestamp = Number(value);
      if (key === "v1") {
        const signature = value.split(":").at(-1);
        if (signature) signatures.push(signature);
      }
    }
    if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
    const expected = createHmac("sha512", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
    return signatures.some((signature) => safeEqualHex(expected, signature));
  }
  // Legacy X-Paystack-Signature: raw-body HMAC with the Paystack secret key.
  const legacyHeader = request.headers.get("x-paystack-signature");
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (!legacyHeader || !paystackSecret) return false;
  const expected = createHmac("sha512", paystackSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, legacyHeader);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  let event: any;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (event?.event !== "charge.success" || typeof event?.data?.reference !== "string") return NextResponse.json({ received: true });

  const reference = event.data.reference;
  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("id, amount_kobo, currency, status").eq("provider_reference", reference).single();
  if (!payment) return NextResponse.json({ error: "Payment reference not found." }, { status: 404 });
  if (payment.status === "successful") return NextResponse.json({ received: true });

  // Verify directly with Paystack as a second independent check before recording success.
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
  const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
  const verified = await verifyResponse.json().catch(() => null);
  const transaction = verified?.data;
  if (!verifyResponse.ok || !verified?.status || transaction?.status !== "success" || Number(transaction.amount) !== Number(payment.amount_kobo) || transaction.currency !== payment.currency) {
    return NextResponse.json({ error: "Paystack verification did not match the expected payment." }, { status: 400 });
  }
  const { error } = await admin.from("payments").update({ status: "successful", verified_at: new Date().toISOString() }).eq("provider_reference", reference);
  if (error) return NextResponse.json({ error: "Payment was verified but could not be recorded." }, { status: 500 });
  return NextResponse.json({ received: true });
}
