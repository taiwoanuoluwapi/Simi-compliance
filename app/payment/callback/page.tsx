import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";

export default async function PaymentCallbackPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  let status = "error";
  let message = "We could not confirm this payment. Check your account or contact support with your payment reference.";
  if (reference && reference.length <= 100) {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (userId) {
      const { data: payment } = await supabase.from("payments").select("provider_reference, amount_kobo, currency, status").eq("provider_reference", reference).eq("customer_id", userId).single();
      if (payment?.status === "successful") {
        status = "success";
      } else if (payment) {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (secret) {
          const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
          const result = await response.json().catch(() => null);
          const transaction = result?.data;
          if (response.ok && result?.status && transaction?.status === "success" && Number(transaction.amount) === Number(payment.amount_kobo) && transaction.currency === payment.currency) {
            const admin = createAdminClient();
            await admin.from("payments").update({ status: "successful", verified_at: new Date().toISOString() }).eq("provider_reference", reference);
            status = "success";
          } else if (["pending", "ongoing", "processing"].includes(transaction?.status)) {
            status = "pending";
          }
        }
      }
    }
  }
  if (status === "success") message = "Your payment has been verified. Your service request is available in your customer account.";
  if (status === "pending") message = "Your payment is still processing. Please do not make another payment. Check your account again shortly or contact support.";
  return <section className="auth-page"><div className="container"><div className="auth-card"><span className="eyebrow">PAYMENT UPDATE</span><h1>{status === "success" ? "Payment confirmed." : status === "pending" ? "Payment processing." : "Payment not confirmed."}</h1><p>{message}</p><Link className="button" href="/account">Return to my account</Link></div></div></section>;
}
