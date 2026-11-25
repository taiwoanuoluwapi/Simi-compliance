import Link from "next/link";
import { signUp } from "@/app/auth/actions";
export const metadata = { title: "Create Customer Account | Simi Compliance" };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <section className="auth-page"><div className="container"><div className="auth-card"><span className="eyebrow">CUSTOMER PORTAL</span><h1>Create your <em>account.</em></h1><p>Use your account to manage service requests and receive updates.</p>
    {params.error && <p className="form-alert">Please check your details and try again.</p>}
    <form action={signUp} className="stack-form"><label>Full name<input name="full_name" autoComplete="name" required minLength={2} maxLength={100}/></label><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Password<input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128}/><small>Use at least 10 characters.</small></label><button className="button" type="submit">Create account</button></form>
    <p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p></div></div></section>;
}
