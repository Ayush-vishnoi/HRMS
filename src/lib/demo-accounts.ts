import 'server-only';

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
    emailKey: 'DEMO_EMPLOYEE_EMAIL',
    passwordKey: 'DEMO_EMPLOYEE_PASSWORD',
  },
  {
    role: 'Manager',
    name: 'Arjun Mehta',
    emailKey: 'DEMO_MANAGER_EMAIL',
    passwordKey: 'DEMO_MANAGER_PASSWORD',
  },
  {
    role: 'HR Admin',
    name: 'Priya Sharma',
    emailKey: 'DEMO_HR_ADMIN_EMAIL',
    passwordKey: 'DEMO_HR_ADMIN_PASSWORD',
  },
] as const;

export function getDemoAccounts(): DemoAccount[] {
  if (process.env.NODE_ENV !== 'development') return [];

  return DEMO_ACCOUNT_ENV_KEYS.flatMap((account) => {
    const email = process.env[account.emailKey]?.trim();
    const password = process.env[account.passwordKey];

    if (!email || !password) return [];

    return [
      {
        role: account.role,
        name: account.name,
        email,
        password,
      },
    ];
  });
}
