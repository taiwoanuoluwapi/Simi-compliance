import Link from "next/link";
import { ArrowUpRight, Menu, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  } catch {
    // Public site remains available before local Supabase credentials are configured.
  }
  return <header className="site-header"><div className="container nav-wrap">
    <Link href="/" className="brand" aria-label="Simi Compliance home"><span className="brand-mark"><ShieldCheck size={23} strokeWidth={2.1}/></span><span className="brand-copy"><strong>SIMI</strong><small>COMPLIANCE & DIGITAL SERVICES</small></span></Link>
    <nav className="desktop-nav" aria-label="Main navigation"><Link href="/">Home</Link><Link href="/about">About Us</Link><Link href="/services">Our Services</Link><Link href="/services?category=business-registration">Business Services</Link><Link href="/services?category=nin-identity">NIN Services</Link><Link href="/resources">Resources</Link><Link href="/contact">Contact</Link></nav>
    <div className="nav-actions"><Link href="/track-request" className="track-link">Track Request</Link><Link href={signedIn ? "/account" : "/login"} className="button button-small">{signedIn ? "My Account" : "Get Started"} <ArrowUpRight size={15}/></Link></div>
    <details className="mobile-nav"><summary aria-label="Open navigation"><Menu size={23}/></summary><nav><Link href="/">Home</Link><Link href="/about">About Us</Link><Link href="/services">Our Services</Link><Link href="/services?category=business-registration">Business Services</Link><Link href="/services?category=nin-identity">NIN Services</Link><Link href="/resources">Resources</Link><Link href="/contact">Contact</Link><Link href="/track-request">Track Request</Link><Link href={signedIn ? "/account" : "/login"}>{signedIn ? "My Account" : "Get Started"}</Link></nav></details>
  </div></header>;
}
