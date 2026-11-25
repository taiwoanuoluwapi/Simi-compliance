import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  const email = claimsData?.claims?.email;
  if (claimsError || !userId || typeof email !== "string") {
    return NextResponse.json({ error: "Sign in before making a payment." }, { status: 401 });
  }
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!paystackSecret || !siteUrl) return NextResponse.json({ error: "Payment service is not configured yet." }, { status: 503 });

  let requestId: string;
  try {
    const body = await request.json();
    if (typeof body.requestId !== "string") throw new Error("Invalid request");
    requestId = body.requestId;
  } catch {
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  }

  const { data: serviceRequest, error: requestError } = await supabase
    .from("service_requests")
    .select("id, customer_id, services(name, price_kobo, price_is_public, fulfilment_type)")
    .eq("id", requestId)
    .eq("customer_id", userId)
    .single();
  if (requestError || !serviceRequest) return NextResponse.json({ error: "Service request not found." }, { status: 404 });
  const service = Array.isArray(serviceRequest.services) ? serviceRequest.services[0] : serviceRequest.services;
  const amount = Number(service?.price_kobo);
  if (!service || !service.price_is_public || service.fulfilment_type !== "direct" || !Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "This service requires a quote or confirmed pricing before online payment." }, { status: 409 });
  }

  const { data: existing } = await supabase.from("payments").select("id, status").eq("request_id", requestId).in("status", ["initialized", "pending", "successful"]).limit(1).maybeSingle();
  if (existing?.status === "successful") return NextResponse.json({ error: "This request has already been paid for." }, { status: 409 });
  if (existing) return NextResponse.json({ error: "A payment attempt is already in progress. Contact support if it has expired." }, { status: 409 });

  const reference = `SIMI-${Date.now()}-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const admin = createAdminClient();
  const { error: insertError } = await admin.from("payments").insert({
    request_id: requestId,
    customer_id: userId,
    provider: "paystack",
    provider_reference: reference,
    amount_kobo: amount,
    currency: "NGN",
    status: "initialized",
  });
  if (insertError) return NextResponse.json({ error: "Unable to create a payment record." }, { status: 500 });

  const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${paystackSecret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, amount: String(amount), currency: "NGN", reference, callback_url: `${siteUrl.replace(/\/$/, "")}/payment/callback` }),
    cache: "no-store",
  });
  const payload = await paystackResponse.json().catch(() => null);
  if (!paystackResponse.ok || !payload?.status || !payload?.data?.authorization_url) {
    await admin.from("payments").update({ status: "failed" }).eq("provider_reference", reference);
    return NextResponse.json({ error: "Paystack could not initialize this payment." }, { status: 502 });
  }
  await admin.from("payments").update({ status: "pending" }).eq("provider_reference", reference);
  return NextResponse.json({ authorizationUrl: payload.data.authorization_url, reference });
}
