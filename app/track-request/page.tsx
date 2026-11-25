import Link from "next/link";
import { ArrowUpRight, ClipboardList } from "lucide-react";
export const metadata = { title: "Track a Request | Simi Compliance" };
export default function TrackRequestPage() {
  return <section className="track-page"><div className="container"><div className="track-panel"><span className="track-icon"><ClipboardList size={28}/></span><span className="eyebrow eyebrow-dark">SECURE CUSTOMER PORTAL</span><h1>Stay informed<br/><em>at every step.</em></h1><p>Sign in to view your service request references, current statuses, payment history and any updates shared by our team.</p><Link className="button" href="/login">Sign in to track a request <ArrowUpRight size={16}/></Link><Link className="track-back" href="/services">Browse services</Link></div></div></section>;
}
