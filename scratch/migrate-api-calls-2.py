import os
import re

BASE = "/Users/ayushvishnoi/Documents/GitHub/HRMS"

files = [
    "src/app/recruitment/page.tsx",
    "src/app/employee-lifecycle/page.tsx",
    "src/app/employees/page.tsx",
    "src/app/payroll/page.tsx",
    "src/app/performance/page.tsx",
    "src/app/talent/page.tsx",
]

BACKEND = "process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'"
TOKEN = "typeof window !== 'undefined' ? localStorage.getItem('hrms_access_token') || '' : ''"
AUTH = "Authorization: `Bearer ${" + TOKEN + "}`"

for rel in files:
    path = os.path.join(BASE, rel)
    with open(path, "r") as fh:
        content = fh.read()

    original = content

    # Replace fetch(`/api/PATH`) - template literal GET no options
    def replace_tpl_get(m):
        url_path = m.group(1)
        return "fetch(`${" + BACKEND + "}/api/" + url_path + "`, { headers: { " + AUTH + " } })"

    content = re.sub(r'fetch\(`/api/([^`]+)`\)', replace_tpl_get, content)

    # Replace fetch(`/api/PATH`, { -> fetch(`BACKEND/api/PATH`, {
    def replace_tpl_opts(m):
        url_path = m.group(1)
        return "fetch(`${" + BACKEND + "}/api/" + url_path + "`, {"

    content = re.sub(r'fetch\(`/api/([^`]+)`,\s*\{', replace_tpl_opts, content)

    # Add auth to cache: 'no-store' only fetches (no headers yet)
    # Pattern: { cache: 'no-store', signal }  -> add headers
    content = re.sub(
        r'\{\s*cache:\s*\'no-store\',\s*signal\s*\}',
        "{ cache: 'no-store', signal, headers: { " + AUTH + " } }",
        content
    )
    content = re.sub(
        r'\{\s*cache:\s*\'no-store\'\s*\}',
        "{ cache: 'no-store', headers: { " + AUTH + " } }",
        content
    )

    if content != original:
        with open(path, "w") as fh:
            fh.write(content)
        print("Updated: " + rel)
    else:
        print("No change: " + rel)

print("Done!")
