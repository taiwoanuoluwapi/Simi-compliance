import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { RequestDocumentUpload } from "@/components/request-document-upload";
import { PaystackCheckoutButton } from "@/components/paystack-checkout-button";
export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: request } = await supabase.from("service_requests").select("id, reference_code, status, submitted_at, customer_note, documents_requested, services(name, description, price_kobo, price_is_public, fulfilment_type)").eq("id", id).single();
  if (!request) notFound();
const service = request.services?.[0];
  const { data: history } = await supabase.from("request_status_history").select("id, old_status, new_status, note, created_at").eq("request_id", id).order("created_at", { ascending: false });
  const { data: docs } = await supabase.from("request_documents").select("id, storage_path, original_filename, created_at").eq("request_id", id).order("created_at", { ascending: false });
  const links = await Promise.all((docs ?? []).map(async (doc) => {
    const { data } = await supabase.storage.from("request-documents").createSignedUrl(doc.storage_path, 60 * 5);
    return { ...doc, url: data?.signedUrl };
  }));
  return <section className="account-page"><div className="container"><Link href="/account" className="text-link">← Back to account</Link><div className="account-panel request-detail-panel"><span className="eyebrow">SERVICE REQUEST</span><h1>{service?.name ?? "Your request"}</h1><p><strong>{request.reference_code}</strong> · <span className="status">{request.status.replaceAll("_", " ")}</span></p><p>Submitted {new Date(request.submitted_at).toLocaleDateString("en-NG")}</p>{request.customer_note && <div className="privacy-note"><strong>Your note</strong><p>{request.customer_note}</p></div>}<h2>Request history</h2>{history?.length ? <div className="history-list">{history.map((item) => <div className="history-item" key={item.id}><strong>{item.new_status.replaceAll("_", " ")}</strong><small>{new Date(item.created_at).toLocaleString("en-NG")}</small>{item.note && <p>{item.note}</p>}</div>)}</div> : <p>Your request updates will appear here.</p>}<h2>Documents</h2>{links.length ? links.map((doc) => <p key={doc.id}><a className="text-link" href={doc.url} target="_blank" rel="noreferrer">{doc.original_filename}</a></p>) : <p>No documents have been submitted.</p>}{service?.price_is_public && service?.price_kobo && service?.fulfilment_type === "direct" && <PaystackCheckoutButton requestId={request.id}/>}
    {request.documents_requested ? <RequestDocumentUpload requestId={request.id}/> : <div className="privacy-note"><strong>No document submission requested yet</strong><p>If supporting documents are needed, our team will enable a secure upload step here. Do not send identity documents through WhatsApp or ordinary contact forms.</p></div>}</div></div></section>;
}
