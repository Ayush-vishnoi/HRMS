/**
 * Dev-only demo accounts, exposed via NEXT_PUBLIC_* env vars
 * so the client-side login page can offer them without a backend endpoint.
 *
 * NOTE: env vars MUST be referenced statically (process.env.KEY) — the bundler
 * only inlines static references into the client bundle. Dynamic lookups
 * (process.env[key]) stay undefined in the browser.
 */

export interface DemoAccount {
  role: 'Employee' | 'Manager' | 'HR Admin';
  name: string;
  email: string;
  password: string;
}

const DEMO_ACCOUNT_ENV_KEYS = [
  {
    role: 'Employee',
    name: 'Ayush Vishnoi',
    email: process.env.NEXT_PUBLIC_DEMO_EMPLOYEE_EMAIL?.trim(),
    password: process.env.NEXT_PUBLIC_DEMO_EMPLOYEE_PASSWORD,
  },
  {
    role: 'Manager',
    name: 'Arjun Mehta',
    email: process.env.NEXT_PUBLIC_DEMO_MANAGER_EMAIL?.trim(),
    password: process.env.NEXT_PUBLIC_DEMO_MANAGER_PASSWORD,
  },
  {
    role: 'HR Admin',
    name: 'Priya Sharma',
    email: process.env.NEXT_PUBLIC_DEMO_HR_ADMIN_EMAIL?.trim(),
    password: process.env.NEXT_PUBLIC_DEMO_HR_ADMIN_PASSWORD,
  },
] as const;

export function getDemoAccounts(): DemoAccount[] {
  if (process.env.NODE_ENV !== 'development') return [];

  return DEMO_ACCOUNT_ENV_KEYS.flatMap((account) => {
    if (!account.email || !account.password) return [];

    return [
      {
        role: account.role,
        name: account.name,
        email: account.email,
        password: account.password,
      },
    ];
  });
}
