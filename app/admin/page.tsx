import { requireStaff } from "@/lib/auth/require-user";
import { updateServiceRequest } from "./actions";
export const metadata = { title: "Operations Dashboard | Simi Compliance" };
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ updated?: string; error?: string }> }) {
  const params = await searchParams;
  const { supabase, role } = await requireStaff();
  const [{ count: requestCount }, { count: pendingCount }, { data: requests }, { data: enquiries }] = await Promise.all([
    supabase.from("service_requests").select("id", { count: "exact", head: true }),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review", "awaiting_information"]),
    supabase.from("service_requests").select("id, reference_code, status, submitted_at, staff_note, documents_requested, profiles(full_name), services(name)").order("submitted_at", { ascending: false }).limit(30),
    supabase.from("contact_enquiries").select("id, full_name, email, phone, service_interest, message, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  return <section className="account-page"><div className="container"><span className="eyebrow">SIMI OPERATIONS</span><h1>Operations <em>overview.</em></h1><p>Signed in with {role} access. Customer data shown here is restricted by your staff permissions.</p>
    {params.updated && <p className="form-success">Request updated successfully.</p>}{params.error && <p className="form-alert">We couldn't update that request. Please try again.</p>}
    <div className="admin-stats"><div><small>Total requests</small><strong>{requestCount ?? 0}</strong></div><div><small>Needs attention</small><strong>{pendingCount ?? 0}</strong></div></div>
    <div className="account-panel"><h2>Service requests</h2>{!requests?.length ? <p>No requests have been submitted yet.</p> : requests.map((r: any) => <article className="admin-request" key={r.id}><div className="admin-request-head"><div><strong>{r.services?.name ?? "Service"}</strong><small>{r.reference_code} · {r.profiles?.full_name ?? "Customer"} · {new Date(r.submitted_at).toLocaleDateString("en-NG")}</small></div><span className="status">{r.status.replaceAll("_", " ")}</span></div><form action={updateServiceRequest} className="admin-update-form"><input type="hidden" name="request_id" value={r.id}/><label>Status<select name="status" defaultValue={r.status}><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="awaiting_information">Awaiting information</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label>Internal note<textarea name="staff_note" rows={2} defaultValue={r.staff_note ?? ""} maxLength={2000}/></label><label className="check-label"><input type="checkbox" name="documents_requested" defaultChecked={r.documents_requested}/> Enable secure document upload for customer</label><button className="button button-small" type="submit">Save update</button></form></article>)}</div>
    <div className="account-panel admin-enquiries"><h2>Recent contact enquiries</h2>{!enquiries?.length ? <p>No new enquiries.</p> : enquiries.map((e: any) => <article className="enquiry-row" key={e.id}><div><strong>{e.full_name}</strong><small>{e.email}{e.phone ? ` · ${e.phone}` : ""} · {e.service_interest || "General enquiry"}</small></div><p>{e.message}</p></article>)}</div>
  </div></section>;
}
