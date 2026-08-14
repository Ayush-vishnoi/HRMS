import type {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from '@auth/core/adapters';
import type { Employee } from '@prisma/client';
import { db } from '@/lib/db';

const toAdapterUser = (employee: Employee): AdapterUser => ({
  id: employee.id,
  name: employee.name,
  email: employee.email,
  emailVerified: null,
  image: employee.avatarUrl,
});

export const hrmsAuthAdapter: Adapter = {
  async createUser(user) {
    const employee = await db.employee.create({
      data: {
        name: user.name ?? user.email.split('@')[0],
        email: user.email.toLowerCase(),
        employeeCode: `EMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        roleTitle: 'Employee',
        department: 'Unassigned',
        joinDate: new Date().toISOString().slice(0, 10),
        location: 'Unassigned',
        avatarUrl: user.image,
      },
    });

    return toAdapterUser(employee);
  },

  async getUser(id) {
    const employee = await db.employee.findUnique({ where: { id } });
    return employee ? toAdapterUser(employee) : null;
  },

  async getUserByEmail(email) {
    const employee = await db.employee.findUnique({
      where: { email: email.toLowerCase() },
    });
    return employee ? toAdapterUser(employee) : null;
  },

  async getUserByAccount({ provider, providerAccountId }) {
    const account = await db.authAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { employee: true },
    });
    return account ? toAdapterUser(account.employee) : null;
  },

  async updateUser({ id, ...user }) {
    const employee = await db.employee.update({
      where: { id },
      data: {
        ...(user.name !== undefined ? { name: user.name ?? undefined } : {}),
        ...(user.email !== undefined ? { email: user.email.toLowerCase() } : {}),
        ...(user.image !== undefined ? { avatarUrl: user.image } : {}),
      },
    });
    return toAdapterUser(employee);
  },

  async deleteUser(userId) {
    const employee = await db.employee.delete({ where: { id: userId } });
    return toAdapterUser(employee);
  },

  async linkAccount(account) {
    await db.authAccount.create({
      data: {
        employeeId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refreshToken: account.refresh_token,
        accessToken: account.access_token,
        expiresAt: account.expires_at,
        tokenType: account.token_type,
        scope: account.scope,
        idToken: account.id_token,
        sessionState:
          typeof account.session_state === 'string' ? account.session_state : null,
      },
    });
  },

  async unlinkAccount({ provider, providerAccountId }) {
    await db.authAccount.delete({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    });
  },

  async createSession(session) {
    const created = await db.authSession.create({
      data: {
        sessionToken: session.sessionToken,
        employeeId: session.userId,
        expires: session.expires,
      },
    });

    return {
      sessionToken: created.sessionToken,
      userId: created.employeeId,
      expires: created.expires,
    };
  },

  async getSessionAndUser(sessionToken) {
    const record = await db.authSession.findUnique({
      where: { sessionToken },
      include: { employee: true },
    });
    if (!record) return null;

    return {
      session: {
        sessionToken: record.sessionToken,
        userId: record.employeeId,
        expires: record.expires,
      },
      user: toAdapterUser(record.employee),
    };
  },

  async updateSession(session) {
    const existing = await db.authSession.findUnique({
      where: { sessionToken: session.sessionToken },
    });
    if (!existing) return null;

    const updated = await db.authSession.update({
      where: { sessionToken: session.sessionToken },
      data: {
        ...(session.expires ? { expires: session.expires } : {}),
        ...(session.userId ? { employeeId: session.userId } : {}),
      },
    });

    return {
      sessionToken: updated.sessionToken,
      userId: updated.employeeId,
      expires: updated.expires,
    };
  },

  async deleteSession(sessionToken) {
    const existing = await db.authSession.findUnique({ where: { sessionToken } });
    if (!existing) return null;

    const deleted = await db.authSession.delete({ where: { sessionToken } });
    return {
      sessionToken: deleted.sessionToken,
      userId: deleted.employeeId,
      expires: deleted.expires,
    } satisfies AdapterSession;
  },

  async createVerificationToken(token) {
    const created = await db.authVerificationToken.create({ data: token });
    return created satisfies VerificationToken;
  },

  async useVerificationToken({ identifier, token }) {
    try {
      const deleted = await db.authVerificationToken.delete({
        where: { identifier_token: { identifier, token } },
      });
      return deleted satisfies VerificationToken;
    } catch {
      return null;
    }
  },
};
