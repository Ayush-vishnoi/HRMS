# MYLOTIC GROUP HRMS

Client-facing human resources management application built with Next.js App Router, React, and TypeScript. It provides role-aware employee, manager, and HR administration workflows for attendance, leave, payroll, recruitment, analytics, meetings, documents, policies, assets, grievances, and Help Desk requests.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Local Development

```bash
npm ci
npm run dev
```

The development server is available at `http://localhost:3000` by default.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

Run the complete production validation pipeline with:

```bash
npm run validate
```

## Project Structure

```text
src/
  app/        Next.js routes, layouts, and global styles
  features/   Domain-owned components, data, APIs, hooks, and types
  shared/     Cross-domain layout, providers, and utilities
public/       Referenced static assets
```

Route modules remain in `src/app` so URL behavior follows App Router conventions. Business UI and domain fixtures live under `src/features`, while reusable infrastructure with multiple domain consumers lives under `src/shared`.

## Application State

The current implementation uses in-memory mock fixtures and browser `localStorage` for demo persistence. `HRMSContext` owns the role-aware client state for authentication, employees, attendance, late clock-in requests, leave requests, and Help Desk tickets.

This is not a production persistence or security boundary. Before deployment with real employee data, replace mock services with authenticated server APIs, PostgreSQL-backed storage, authorization checks on the server, audit logging, and protected handling of payroll and personally identifiable information.

## Roles & Access

The application recognizes five roles on a single privilege ladder, each inheriting the access of the roles below it:

| Role | Purpose |
| --- | --- |
| `employee` | Self-service: own profile, attendance, leave, payslips. |
| `manager` | The above, plus management of their direct team. |
| `admin` | HR operations: employees, payroll, recruitment, policies, analytics. |
| `ceo` | Executive oversight: org-wide visibility and a dedicated Executive Dashboard. |
| `super_admin` | System owner: user & role administration and the audit trail. |

`ceo` and `super_admin` both inherit full HR Admin (`admin`) access, so no HR workflow is lost. The finer distinctions are enforced by the hierarchy-aware `RolesGuard` together with the `@Roles()` decorator:

- The CEO's executive summary lives at `GET /api/analytics/executive` (`@Roles('ceo')` — CEO and Super Admin).
- System administration lives under `GET|PATCH /api/administration/*` (`@Roles('super_admin')` — Super Admin only), backing the `/administration` console for managing users, assigning roles, and reading audit logs.

The database stores the true role on `employees.user_role`; the JWT strategy exposes it as `rawRole` while collapsing `userRole` onto the legacy `employee/manager/admin` surface so existing inline checks keep working.

### Bootstrapping the first Super Admin

Because the Super Admin console itself requires a Super Admin, promote one account directly in the database once, then manage everyone else through the UI:

```sql
UPDATE employees SET user_role = 'super_admin' WHERE email = 'you@company.com';
```



- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- TanStack React Query
- React Hook Form and Zod
- Recharts
- XLSX
- Lucide React

## Production Build

```bash
npm run build
npm run start
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. `DATABASE_URL` and `REDIS_URL` are required; the email variables are optional.

### Email Delivery (Resend)

Outbound email (candidate magic links, offer notifications) is dispatched through [`sendEmail()`](src/lib/notifications/email-service.ts:31). Without configuration it runs in adapter-ready mode — messages are logged to the server console and an in-memory dispatch log, nothing is actually sent.

To enable real delivery via [Resend](https://resend.com):

1. Create a free account (100 emails/day on the free tier) and verify your sending domain under **Domains**.
2. Create an API key under **API Keys**.
3. Add to `.env`:

   ```bash
   RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxx"
   RESEND_DOMAIN="yourdomain.com"                      # builds the from address
   EMAIL_FROM="HRMS <onboarding@yourdomain.com>"       # optional explicit override
   NEXT_PUBLIC_APP_URL="http://localhost:3000"         # base for candidate portal links
   ```

4. Restart `npm run dev`. Every email dispatcher (magic link, offer available, offer accepted/rejected, signature completed) now sends through the Resend API using plain `fetch` — no extra npm dependency. Delivery failures are logged with `[EMAIL DISPATCH FAILED]` / `[EMAIL DISPATCH ERROR]` prefixes and never break the surrounding workflow.
