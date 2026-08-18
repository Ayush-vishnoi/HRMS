import os
import re

BASE = "/Users/ayushvishnoi/Documents/GitHub/HRMS"

files = [
    "src/app/analytics/page.tsx",
    "src/app/assets/page.tsx",
    "src/app/benefits/page.tsx",
    "src/app/documents/page.tsx",
    "src/app/employee-lifecycle/page.tsx",
    "src/app/employees/page.tsx",
    "src/app/engagement/page.tsx",
    "src/app/exit/page.tsx",
    "src/app/expenses/page.tsx",
    "src/app/lms/page.tsx",
    "src/app/my-team/page.tsx",
    "src/app/payroll/page.tsx",
    "src/app/performance/page.tsx",
    "src/app/policies/page.tsx",
    "src/app/recruitment/page.tsx",
    "src/app/skills/page.tsx",
    "src/app/talent/page.tsx",
    "src/features/meetings/api/meetings.ts",
    "src/features/payroll/components/PayslipModal.tsx",
]

BACKEND_EXPR = "process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'"
TOKEN_EXPR = "typeof window !== 'undefined' ? localStorage.getItem('hrms_access_token') || '' : ''"
AUTH_HEADER = "Authorization: `Bearer ${" + TOKEN_EXPR + "}`"
CT_HEADER = "'Content-Type': 'application/json'"

def get_token():
    return AUTH_HEADER

for rel in files:
    path = os.path.join(BASE, rel)
    with open(path, "r") as fh:
        content = fh.read()

    original = content

    # Replace fetch('/api/PATH') - no options (GET)
    def replace_get(m):
        url_path = m.group(1)
        return "fetch(`${" + BACKEND_EXPR + "}/api/" + url_path + "`, { headers: { " + AUTH_HEADER + " } })"

    content = re.sub(r"fetch\('/api/([^']+)'\)", replace_get, content)

    # Replace fetch('/api/PATH', { -> fetch(`BACKEND/api/PATH`, {
    def replace_with_opts(m):
        url_path = m.group(1)
        return "fetch(`${" + BACKEND_EXPR + "}/api/" + url_path + "`, {"

    content = re.sub(r"fetch\('/api/([^']+)',\s*\{", replace_with_opts, content)

    # Inject auth into existing headers: { 'Content-Type': 'application/json' }
    content = content.replace(
        "headers: { 'Content-Type': 'application/json' }",
        "headers: { 'Content-Type': 'application/json', " + AUTH_HEADER + " }"
    )

    # Also handle cache: 'no-store' only fetches (no body) - add auth header
    content = re.sub(
        r"headers:\s*\{\s*\}",
        "headers: { " + AUTH_HEADER + " }",
        content
    )

    if content != original:
        with open(path, "w") as fh:
            fh.write(content)
        print("Updated: " + rel)
    else:
        print("No change: " + rel)

print("Migration complete!")
