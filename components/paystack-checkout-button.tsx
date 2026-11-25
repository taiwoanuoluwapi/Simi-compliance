"use client";
import { useState } from "react";
export function PaystackCheckoutButton({ requestId }: { requestId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function startPayment() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/payments/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId }) });
      const result = await response.json();
      if (!response.ok || !result.authorizationUrl) throw new Error(result.error || "Unable to start payment.");
      window.location.assign(result.authorizationUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment could not be started.");
      setBusy(false);
    }
  }
  return <div className="checkout-action"><button className="button" type="button" onClick={startPayment} disabled={busy}>{busy ? "Preparing secure checkout…" : "Pay securely with Paystack"}</button>{error && <p role="alert">{error}</p>}</div>;
}
