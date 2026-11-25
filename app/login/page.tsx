import Link from "next/link";
import { signIn } from "@/app/auth/actions";
export const metadata = { title: "Customer Login | Simi Compliance" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <section className="auth-page"><div className="container"><div className="auth-card"><span className="eyebrow">CUSTOMER PORTAL</span><h1>Welcome <em>back.</em></h1><p>Sign in to view your service requests and account information.</p>
    {params.error && <p className="form-alert">We couldn't sign you in. Check your details and try again.</p>}
    {params.message === "check-email" && <p className="form-success">Account created. Check your email to confirm your address before signing in.</p>}
    <form action={signIn} className="stack-form"><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Password<input name="password" type="password" autoComplete="current-password" required minLength={10} maxLength={128}/></label><button className="button" type="submit">Sign in</button></form>
    <p className="auth-switch">New to Simi Compliance? <Link href="/register">Create an account</Link></p></div></div></section>;
}
