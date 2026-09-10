"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const rows = await prisma.$queryRaw `SELECT id, name, email, user_role, created_at, updated_at, organization_id, business_unit_id, department_id, designation_id
    FROM employees WHERE user_role = 'ceo'`;
    for (const r of rows)
        console.log(JSON.stringify(r, null, 2));
}
main()
    .catch((err) => {
    console.error('FAILED:', err.message);
    process.exitCode = 1;
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=inspect-ceo-row-tmp.js.map