"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const enumValues = await prisma.$queryRaw `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'UserRole' ORDER BY e.enumsortorder`;
    console.log('Postgres UserRole enum values:', enumValues.map((v) => v.enumlabel).join(', '));
    const bad = await prisma.$queryRaw `SELECT id, employee_code, name, email, user_role FROM employees WHERE user_role NOT IN ('employee','manager','admin')`;
    console.log(`Rows outside schema enum: ${bad.length}`);
    for (const row of bad) {
        console.log('BAD ROW:', JSON.stringify(row));
    }
    const counts = await prisma.$queryRaw `SELECT user_role, COUNT(*)::bigint AS n FROM employees GROUP BY user_role ORDER BY n DESC`;
    for (const c of counts)
        console.log(`user_role=${c.user_role} count=${c.n}`);
}
main()
    .catch((err) => {
    console.error('FAILED:', err.message);
    process.exitCode = 1;
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=check-user-role-tmp.js.map