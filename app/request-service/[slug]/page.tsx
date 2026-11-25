import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { services, categories } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import { submitServiceRequest } from "./actions";
export default async function RequestServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);
  if (!service) notFound();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  const category = categories.find((item) => item.slug === service.category);
  return <section className="auth-page"><div className="container"><div className="auth-card auth-card-wide"><span className="eyebrow">{category?.title}</span><h1>Request <em>{service.title}.</em></h1><p>Submit an initial request. Our team will review it and confirm the applicable requirements and next steps.</p><div className="privacy-note"><strong>Privacy reminder</strong><p>Do not enter NIN, BVN, passwords or other sensitive identity details here. If documents are required, we will provide an authenticated, protected upload process.</p></div><form action={submitServiceRequest} className="stack-form"><input type="hidden" name="service_slug" value={service.slug}/><label>What would you like us to know? <textarea name="customer_note" rows={5} maxLength={2000} placeholder="Briefly describe the assistance you need. Please do not include sensitive identity numbers."/></label><button className="button" type="submit">Submit service request</button></form><p className="auth-switch"><Link href={`/services/${service.slug}`}>Back to service details</Link></p></div></div></section>;
}
