# Simi Compliance & Digital Services

Custom Next.js application for business registration assistance, corporate compliance, identity documentation support and digital services in Nigeria.

## Stack
- Next.js App Router + React + TypeScript
- Supabase PostgreSQL, Auth and private Storage
- Paystack (server-side transaction initialization, verification and webhook foundation)
- Vercel (deployment after local verification)

## Local setup
1. Use Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and enter the Supabase project URL and publishable key.
4. Run `npm run dev`.

## Supabase setup
1. The dedicated project has already been created: `simi-compliance-production` (`zgqnfqqbzygahtywkhgp`) in `eu-west-1`.
2. All three migrations are already applied and verified. The local migration filenames match the remote migration history. The database contains 5 service categories and 21 service records.
3. `.env.local` is prefilled with the project URL and browser-safe publishable key. Add the server-only Supabase secret key from [Project API Keys](https://supabase.com/dashboard/project/zgqnfqqbzygahtywkhgp/settings/api-keys). Do not use a publishable key in place of the server secret.
4. Configure Auth email confirmation and the local redirect URL `http://localhost:3000/**`.
5. Set the site URL to the local origin during development.
6. In Auth → Email Templates, set the Confirm signup link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`; add `http://localhost:3000/auth/confirm` to allowed redirects.
7. After creating the first trusted account, promote it to admin using the one-time SQL below from the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR-VERIFIED-ADMIN-EMAIL');
```

Run this only for a verified owner account. Never expose the Supabase secret key to browser code.

## Security notes
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is intended for browser use; RLS remains mandatory.
- `SUPABASE_SECRET_KEY` is server-only and must never be committed or exposed to the browser.
- Customer data is protected by row-level policies. Staff roles are assigned only through trusted administrative operations.
- Request documents use a private bucket with per-user/per-request paths and size/type restrictions.
- Ordinary enquiry forms must never collect NIN, BVN, passwords or sensitive identity documents.
- Government and identity-related services remain subject to eligibility, official procedures and authorized channels. No government affiliation or guaranteed outcome is implied.
- Prices and processing times are not seeded until confirmed by the business.
- Supabase security advisor currently reports no security findings; performance advisor only reports unused indexes on the newly-created, empty project.

## Paystack configuration
- Add the Paystack secret key as `PAYSTACK_SECRET_KEY` only in server environment variables.
- Add the webhook signing secret as `PAYSTACK_WEBHOOK_SECRET` when Paystack has issued one.
- Configure the Paystack webhook URL as `/api/webhooks/paystack`.
- The checkout route refuses payment unless the service has an active public price in kobo and uses the server database price as the trusted amount.
- Webhooks are checked against Paystack signatures and the transaction is verified with Paystack before the payment record is marked successful.

## Implemented backend foundation
- SSR-aware Supabase browser/server clients and session refresh middleware.
- Email/password sign-up, sign-in and sign-out actions.
- Customer request creation, account request listing and request detail pages.
- Secure document upload UI that is only enabled after staff requests documents.
- Staff-only operations overview.
- RLS migration for profiles, catalogue, requests, status history, payments, documents, messages and enquiries.
- Private document bucket and upload access policies.
- Public contact enquiries with a honeypot field and staff-only inbox.
- Paystack transaction initialization, callback verification and signed webhook handling (requires keys and confirmed service prices).

## Still to complete before production
- Configure the Supabase secret key locally and in the deployment environment; configure Auth email confirmation and allowed redirect URLs.
- Run end-to-end RLS checks with real customer/staff/admin accounts.
- Add customer profile editing, document replacement/removal workflows and staff assignment.
- Add staff assignment, status update actions and support messaging UI.
- Test Paystack initialization, signed webhook verification and reconciliation using test credentials and confirmed prices.
- Add rate limiting/CAPTCHA to public contact submissions, transactional email delivery, audit logs, automated tests and production monitoring.
