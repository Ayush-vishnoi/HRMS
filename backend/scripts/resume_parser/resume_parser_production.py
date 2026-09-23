#!/usr/bin/env python3
"""Production-oriented multi-format resume parser (local JSON output).

Key properties:
- Uses only the supplied file; no network calls or invented data.
- Supports PDF, DOCX, DOC, ODT, RTF, TXT, PNG, JPG, JPEG, TIFF, and WEBP.
- Reads PDF/DOCX text and hyperlink annotations.
- OCR fallback for image-only PDFs and image files.
- Conservative contact/name extraction with evidence and confidence.
- Exact section detection, declared skill categories, canonical skills.
- Structured experience/projects/education/certifications/achievements.
- Validation warnings instead of silently pretending uncertain data is correct.

Usage:
  pip install pymupdf pillow pytesseract
  python resume_parser_production.py resume.docx --pretty
  python resume_parser_production.py resume.pdf --pretty --output result.json

For OCR, the Tesseract executable must also be installed on the machine.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

try:
    import pymupdf
except ImportError as exc:
    raise SystemExit("Install PyMuPDF: pip install pymupdf") from exc

SCHEMA_VERSION = "3.0.0"
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".odt", ".rtf", ".txt", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"}

SECTION_ALIASES: dict[str, tuple[str, ...]] = {
    "summary": ("summary", "professional summary", "profile", "professional profile", "objective", "career objective", "about me"),
    "skills": ("skills", "technical skills", "key skills", "core skills", "core competencies", "technologies", "technical expertise"),
    "experience": ("experience", "work experience", "professional experience", "employment", "employment history", "work history", "internships"),
    "projects": ("projects", "personal projects", "academic projects", "key projects", "selected projects"),
    "education": ("education", "academic background", "academics", "qualifications", "educational qualifications"),
    "certifications": ("certifications", "certificates", "licenses", "licenses and certifications"),
    "achievements": ("achievements", "accomplishments", "awards", "awards and achievements", "honors", "honours"),
    "publications": ("publications", "research", "research and publications"),
    "positions": ("positions of responsibility", "leadership", "leadership experience"),
    "activities": ("activities", "extracurricular activities", "volunteering"),
}

# Canonical skill -> strict aliases. Short ambiguous aliases such as "js" are
# intentionally excluded because they produce false positives (e.g. Chart.js).
SKILL_ALIASES: dict[str, tuple[str, ...]] = {
    "Python": ("python",), "Java": ("java",), "JavaScript": ("javascript",),
    "TypeScript": ("typescript",), "C": ("c programming",), "C++": ("c++",),
    "C#": ("c#", "c sharp"), "SQL": ("sql",), "HTML": ("html",), "CSS": ("css",),
    "Data Structures and Algorithms": ("data structures and algorithms", "dsa"),
    "Object-Oriented Programming": ("object-oriented programming", "object oriented programming", "oop"),
    "Database Management Systems": ("database management systems", "dbms"),
    "Operating Systems": ("operating systems",), "Computer Networks": ("computer networks",),
    "Machine Learning": ("machine learning",), "Supervised Learning": ("supervised learning",),
    "Unsupervised Learning": ("unsupervised learning",), "Regression": ("regression",),
    "Classification": ("classification",), "Random Forest": ("random forest",),
    "XGBoost": ("xgboost",), "Clustering": ("clustering",), "K-Means": ("k-means", "k means"),
    "Feature Engineering": ("feature engineering",), "Model Evaluation": ("model evaluation",),
    "Predictive Modeling": ("predictive modeling", "predictive modelling"),
    "Deep Learning": ("deep learning",), "Computer Vision": ("computer vision",),
    "Natural Language Processing": ("natural language processing", "nlp"),
    "Generative AI": ("generative ai",), "Large Language Models": ("large language models", "llms", "llm"),
    "Retrieval-Augmented Generation": ("retrieval-augmented generation", "retrieval augmented generation", "rag"),
    "MobileNetV3": ("mobilenetv3", "mobilenetv3small"), "Llama": ("llama",), "MiniLM": ("minilm",),
    "Exploratory Data Analysis": ("exploratory data analysis", "eda"),
    "Statistical Analysis": ("statistical analysis",), "Data Cleaning": ("data cleaning",),
    "Data Visualization": ("data visualization", "data visualisation"),
    "Business Intelligence": ("business intelligence",), "Customer Segmentation": ("customer segmentation",),
    "Cohort Analysis": ("cohort analysis",), "Churn Analysis": ("churn analysis",),
    "RFM Analysis": ("rfm", "recency frequency monetary"), "Pareto Analysis": ("pareto analysis",),
    "Pandas": ("pandas",), "NumPy": ("numpy",), "Scikit-learn": ("scikit-learn", "scikit learn", "sklearn"),
    "TensorFlow": ("tensorflow",), "TensorFlow Lite": ("tensorflow lite",),
    "PyTorch": ("pytorch",), "Matplotlib": ("matplotlib",), "Seaborn": ("seaborn",),
    "React": ("react", "react.js", "reactjs"), "Angular": ("angular",), "Vue.js": ("vue.js", "vuejs"),
    "Node.js": ("node.js", "nodejs", "node js"), "Django": ("django",), "Flask": ("flask",),
    "FastAPI": ("fastapi", "fast api"), "Spring Boot": ("spring boot",),
    "REST APIs": ("rest api", "rest apis", "restful api", "restful apis"), "GraphQL": ("graphql",),
    "MySQL": ("mysql",), "PostgreSQL": ("postgresql", "postgres"), "MongoDB": ("mongodb", "mongo db"),
    "Pinecone": ("pinecone",), "Vector Databases": ("vector databases", "vector database"),
    "Power BI": ("power bi",), "Tableau": ("tableau",), "Microsoft Excel": ("excel", "microsoft excel"),
    "Git": ("git",), "GitHub": ("github",), "Docker": ("docker",), "Kubernetes": ("kubernetes", "k8s"),
    "AWS": ("aws", "amazon web services"), "Amazon SageMaker": ("amazon sagemaker", "sagemaker"),
    "Azure": ("azure",), "Google Cloud Platform": ("google cloud platform", "gcp"),
    "Jupyter Notebook": ("jupyter notebook", "jupyter"), "Gunicorn": ("gunicorn",), "Render": ("render",),
    "Agile": ("agile",), "Jira": ("jira",),
    # --- Org recruitment domains: frontend, DevOps/SRE, security, MLOps, automation, QA, sales ---
    "Next.js": ("next.js", "nextjs", "next js"), "Redux": ("redux",),
    "Tailwind CSS": ("tailwind css", "tailwind", "tailwindcss"), "Svelte": ("svelte",),
    "Express.js": ("express.js", "expressjs", "express js"), "NestJS": ("nestjs", "nest.js"),
    "Kafka": ("kafka", "apache kafka"), "Spark": ("apache spark", "pyspark"),
    "Redis": ("redis",), "Elasticsearch": ("elasticsearch",), "Snowflake": ("snowflake",),
    "Airflow": ("airflow", "apache airflow"),
    "Terraform": ("terraform",), "Ansible": ("ansible",), "Jenkins": ("jenkins",),
    "CI/CD": ("ci/cd", "ci cd", "continuous integration"), "Helm": ("helm",),
    "Prometheus": ("prometheus",), "Grafana": ("grafana",), "Linux": ("linux",),
    "GitHub Actions": ("github actions",), "ArgoCD": ("argocd", "argo cd"),
    "Site Reliability Engineering": ("site reliability engineering", "sre"),
    "Observability": ("observability",),
    "Amazon EC2": ("ec2", "amazon ec2"), "Amazon S3": ("amazon s3", "s3 bucket"),
    "Amazon EKS": ("eks", "amazon eks"), "AWS Lambda": ("aws lambda",),
    "CloudFormation": ("cloudformation", "cloud formation"),
    "Identity and Access Management": ("identity and access management", "iam"),
    "SOC 2": ("soc 2", "soc2"), "SIEM": ("siem",), "OWASP": ("owasp",),
    "OAuth": ("oauth", "oauth2"), "Penetration Testing": ("penetration testing", "pentesting"),
    "Zero Trust": ("zero trust",), "Threat Modeling": ("threat modeling", "threat modelling"),
    "Compliance": ("compliance",), "GDPR": ("gdpr",), "Encryption": ("encryption",),
    "Kubernetes Security": ("kubernetes security",),
    "MLOps": ("mlops",), "Model Deployment": ("model deployment",),
    "Experimentation": ("experimentation",), "A/B Testing": ("a/b testing", "ab testing"),
    "Keras": ("keras",),
    "System Design": ("system design",), "Microservices": ("microservices", "micro services"),
    "Distributed Systems": ("distributed systems",), "Scalability": ("scalability",),
    "n8n": ("n8n",), "Zapier": ("zapier",), "Workflow Automation": ("workflow automation",),
    "RPA": ("robotic process automation", "rpa"), "Make.com": ("make.com", "integromat"),
    "Testing": ("software testing", "qa testing", "test automation"),
    "Jest": ("jest",), "Cypress": ("cypress",), "Selenium": ("selenium",),
    "Playwright": ("playwright",), "Pytest": ("pytest",), "JUnit": ("junit",),
    "TestNG": ("testng",), "End-to-End Testing": ("end-to-end testing", "e2e testing"),
    "Load Testing": ("load testing",), "Appium": ("appium",),
    "B2B Sales": ("b2b sales", "b2b"), "B2C Sales": ("b2c sales", "b2c"),
    "CRM": ("crm",), "Salesforce": ("salesforce", "sfdc"), "HubSpot": ("hubspot",),
    "Negotiation": ("negotiation",), "Lead Generation": ("lead generation",),
    "Account Management": ("account management",), "Team Leadership": ("team leadership",),
    "Stakeholder Management": ("stakeholder management",), "Cold Calling": ("cold calling",),
    "Pipeline Management": ("pipeline management",),
}

EMAIL_RE = re.compile(r"(?i)(?<![\w.+-])[\w.!#$%&'*+/=?^`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+(?![\w.-])")
PHONE_CANDIDATE_RE = re.compile(r"(?<!\w)(?:\+?\d{1,3}[\s().-]*)?(?:\d[\s().-]*){9,12}(?!\w)")
MONTH_TOKEN = r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
DATE_POINT = rf"(?:{MONTH_TOKEN}\s+(?:19|20)\d\d|(?:19|20)\d\d)"
DATE_RANGE_RE = re.compile(rf"(?i)\b({DATE_POINT}\s*[–—-]\s*(?:present|current|{DATE_POINT}))\b")
URL_RE = re.compile(r"https?://[^\s<>()\[\]{}]+", re.I)

@dataclass
class PageExtraction:
    page: int
    text: str
    method: str
    characters: int


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).replace("\u00a0", " ")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    # Remove excessive blank lines while preserving section boundaries.
    out: list[str] = []
    for line in lines:
        if line or (out and out[-1]):
            out.append(line)
    return "\n".join(out).strip()


def dedupe(items: Iterable[str], key=lambda value: value.lower()) -> list[str]:
    seen: set[Any] = set(); result: list[str] = []
    for item in items:
        marker = key(item)
        if item and marker not in seen:
            seen.add(marker); result.append(item)
    return result


def ocr_page(page: Any, dpi: int = 220) -> tuple[str, str | None]:
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return "", "OCR dependencies are missing; install pillow and pytesseract"
    pix = page.get_pixmap(dpi=dpi, alpha=False)
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    try:
        return normalize_text(pytesseract.image_to_string(image, config="--psm 6")), None
    except Exception as exc:
        return "", f"OCR failed: {exc}"


def extract_pdf(path: Path, enable_ocr: bool = True) -> tuple[str, list[PageExtraction], list[str]]:
    if not path.is_file(): raise FileNotFoundError(f"PDF not found: {path}")
    if path.suffix.lower() != ".pdf": raise ValueError("Input must be a PDF file")
    warnings: list[str] = []; pages: list[PageExtraction] = []
    with pymupdf.open(path) as document:
        if document.needs_pass: raise ValueError("Password-protected PDF is not supported without a password")
        for index, page in enumerate(document, 1):
            text = normalize_text(page.get_text("text", sort=True))
            method = "pdf_text"
            if len(re.sub(r"\s", "", text)) < 40 and enable_ocr:
                ocr_text, ocr_error = ocr_page(page)
                if len(ocr_text) > len(text):
                    text, method = ocr_text, "ocr"
                elif ocr_error:
                    warnings.append(f"Page {index}: {ocr_error}")
            if not text: warnings.append(f"Page {index} contains no readable text")
            pages.append(PageExtraction(index, text, method, len(text)))
    combined = normalize_text("\n\n".join(page.text for page in pages))
    if not combined:
        detail = "; ".join(warnings) if warnings else "OCR may be unavailable or the PDF may be corrupt"
        raise ValueError(f"No readable text found. {detail}")
    return combined, pages, warnings


def extract_pdf_links(path: Path) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    with pymupdf.open(path) as document:
        for page_no, page in enumerate(document, 1):
            words = page.get_text("words")
            for link in page.get_links():
                uri = link.get("uri")
                if not uri: continue
                rect = pymupdf.Rect(link["from"])
                label_words = [w[4] for w in words if pymupdf.Rect(w[:4]).intersects(rect)]
                label = " ".join(label_words).strip() or uri
                links.append({"label": label, "url": uri, "page": str(page_no)})
    return dedupe(links, key=lambda x: x["url"])


def extract_docx(path: Path) -> tuple[str, list[PageExtraction], list[str], list[dict[str, str]]]:
    try:
        from docx import Document
    except ImportError as exc:
        raise ValueError("DOCX support requires python-docx: pip install python-docx") from exc
    try:
        document = Document(str(path))
    except Exception as exc:
        raise ValueError(f"Could not read DOCX file: {exc}") from exc

    chunks: list[str] = []
    chunks.extend(p.text for p in document.paragraphs if p.text.strip())
    for table in document.tables:
        for row in table.rows:
            values = [normalize_text(cell.text) for cell in row.cells]
            line = " | ".join(value for value in values if value)
            if line: chunks.append(line)
    for section in document.sections:
        for container in (section.header, section.footer):
            chunks.extend(p.text for p in container.paragraphs if p.text.strip())

    links: list[dict[str, str]] = []
    for relationship in document.part.rels.values():
        if relationship.is_external and str(relationship.target_ref).lower().startswith(("http://", "https://", "mailto:")):
            target = str(relationship.target_ref)
            links.append({"label": target, "url": target, "page": "document"})
    text = normalize_text("\n".join(chunks))
    if not text: raise ValueError("No readable text found in DOCX file")
    records = [PageExtraction(1, text, "docx_text", len(text))]
    return text, records, [], dedupe(links, key=lambda x: x["url"])


def extract_text_file(path: Path) -> tuple[str, list[PageExtraction], list[str], list[dict[str, str]]]:
    raw = path.read_bytes()
    decoded: str | None = None
    encoding_used = ""
    for encoding in ("utf-8-sig", "utf-16", "cp1252", "latin-1"):
        try:
            decoded = raw.decode(encoding); encoding_used = encoding; break
        except UnicodeDecodeError:
            continue
    if decoded is None: raise ValueError("Could not decode text file")
    text = normalize_text(decoded)
    if not text: raise ValueError("Text file is empty")
    links = [{"label": url, "url": url, "page": "document"} for url in URL_RE.findall(text)]
    warning = [] if encoding_used in {"utf-8-sig", "utf-8"} else [f"Text decoded using {encoding_used}"]
    return text, [PageExtraction(1, text, "plain_text", len(text))], warning, dedupe(links, key=lambda x: x["url"])


def extract_image(path: Path, enable_ocr: bool) -> tuple[str, list[PageExtraction], list[str], list[dict[str, str]]]:
    if not enable_ocr: raise ValueError("Image input requires OCR; remove --no-ocr")
    try:
        import pytesseract
        from PIL import Image
    except ImportError as exc:
        raise ValueError("Image OCR requires pillow and pytesseract") from exc
    try:
        text = normalize_text(pytesseract.image_to_string(Image.open(path), config="--psm 6"))
    except Exception as exc:
        raise ValueError(f"Image OCR failed: {exc}") from exc
    if not text: raise ValueError("OCR found no readable text in image")
    return text, [PageExtraction(1, text, "ocr", len(text))], ["OCR was used; manually review extracted fields"], []


def extract_legacy_office(path: Path) -> tuple[str, list[PageExtraction], list[str], list[dict[str, str]]]:
    executable = shutil.which("soffice") or shutil.which("libreoffice")
    if not executable:
        raise ValueError(f"{path.suffix.upper()} support requires LibreOffice on the server")
    with tempfile.TemporaryDirectory(prefix="resume-convert-") as temp_dir:
        command = [executable, "--headless", "--convert-to", "docx", "--outdir", temp_dir, str(path)]
        try:
            completed = subprocess.run(command, capture_output=True, text=True, timeout=45, check=False)
        except subprocess.TimeoutExpired as exc:
            raise ValueError("Office-file conversion timed out") from exc
        converted = Path(temp_dir) / f"{path.stem}.docx"
        if completed.returncode != 0 or not converted.exists():
            message = (completed.stderr or completed.stdout or "conversion failed").strip()
            raise ValueError(f"LibreOffice conversion failed: {message}")
        text, records, warnings, links = extract_docx(converted)
        for record in records: record.method = f"{path.suffix.lower()[1:]}_via_libreoffice"
        warnings.append(f"{path.suffix.upper()} was converted with LibreOffice before parsing")
        return text, records, warnings, links


def extract_source(path: Path, enable_ocr: bool) -> tuple[str, list[PageExtraction], list[str], list[dict[str, str]]]:
    if not path.is_file(): raise FileNotFoundError(f"Resume file not found: {path}")
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {suffix or 'no extension'}. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")
    if suffix == ".pdf":
        text, records, warnings = extract_pdf(path, enable_ocr)
        return text, records, warnings, extract_pdf_links(path)
    if suffix == ".docx": return extract_docx(path)
    if suffix == ".txt": return extract_text_file(path)
    if suffix in {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"}: return extract_image(path, enable_ocr)
    return extract_legacy_office(path)


def normalized_heading(line: str) -> str:
    value = unicodedata.normalize("NFKC", line).lower().strip()
    value = re.sub(r"[^a-z &]", " ", value)
    return re.sub(r"\s+", " ", value).strip(" &")


def identify_heading(line: str) -> str | None:
    value = normalized_heading(line)
    if not value or len(value) > 45: return None
    for canonical, aliases in SECTION_ALIASES.items():
        if value in aliases: return canonical
    return None


def split_sections(text: str) -> tuple[dict[str, str], str]:
    lines = text.splitlines(); starts: list[tuple[int, str]] = []
    for i, line in enumerate(lines):
        heading = identify_heading(line)
        if heading: starts.append((i, heading))
    sections: dict[str, str] = {}
    first = starts[0][0] if starts else len(lines)
    header = "\n".join(lines[:first]).strip()
    for pos, (start, name) in enumerate(starts):
        end = starts[pos + 1][0] if pos + 1 < len(starts) else len(lines)
        body = "\n".join(lines[start + 1:end]).strip()
        if body: sections[name] = (sections.get(name, "") + ("\n" if name in sections else "") + body).strip()
    return sections, header


def extract_emails(text: str) -> list[str]:
    return dedupe([m.group(0).rstrip(".,;") for m in EMAIL_RE.finditer(text)])


def extract_phones(text: str) -> list[str]:
    values: list[str] = []
    for match in PHONE_CANDIDATE_RE.finditer(text):
        raw = match.group(0).strip(" .,-")
        digits = re.sub(r"\D", "", raw)
        # 10-digit local number or 11-13 digit number with country code.
        if 10 <= len(digits) <= 13 and not re.fullmatch(r"(?:19|20)\d{2}.*", digits): values.append(raw)
    return dedupe(values, key=lambda x: re.sub(r"\D", "", x))


def guess_name(header: str) -> tuple[str | None, float, str | None]:
    forbidden = {"resume", "curriculum vitae", "cv"}
    for line in header.splitlines()[:8]:
        candidate = line.strip(" •|-")
        if not candidate or candidate.lower() in forbidden or "@" in candidate or any(ch.isdigit() for ch in candidate): continue
        words = re.findall(r"[A-Za-z][A-Za-z.'-]*", candidate)
        if 2 <= len(words) <= 5 and len(" ".join(words)) <= 70:
            confidence = 0.94 if line == line.upper() else 0.86
            return " ".join(words), confidence, line
    return None, 0.0, None


def strict_alias_present(text: str, alias: str) -> bool:
    escaped = re.escape(alias).replace(r"\ ", r"\s+")
    return re.search(rf"(?<![A-Za-z0-9]){escaped}(?![A-Za-z0-9])", text, re.I) is not None


def extract_canonical_skills(skill_text: str, full_text: str) -> tuple[list[str], dict[str, list[str]]]:
    primary = skill_text or full_text
    skills: list[str] = []; evidence: dict[str, list[str]] = {}
    for canonical, aliases in SKILL_ALIASES.items():
        matched = [alias for alias in aliases if strict_alias_present(primary, alias)]
        if matched:
            skills.append(canonical); evidence[canonical] = matched
    return skills, evidence


def extract_declared_skill_categories(skill_text: str) -> dict[str, list[str]]:
    categories: dict[str, list[str]] = {}; current: str | None = None
    for line in skill_text.splitlines():
        match = re.match(r"^([^:]{2,50}):\s*(.+)$", line)
        if match:
            current = match.group(1).strip()
            categories[current] = [match.group(2).strip()]
        elif current and line:
            categories[current].append(line.strip())
    return {name: values for name, values in categories.items()}


def split_bullets(text: str) -> list[str]:
    normalized = re.sub(r"(?m)^\s*[●•▪◦*-]\s*", "§", text)
    return [item.strip() for item in normalized.split("§") if item.strip()]


def date_ranges(text: str) -> list[str]:
    return dedupe([m.group(1).strip() for m in DATE_RANGE_RE.finditer(text)])


def structured_entries(text: str, mode: str) -> list[dict[str, Any]]:
    if not text: return []
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    entries: list[dict[str, Any]] = []; current: dict[str, Any] | None = None
    for line in lines:
        ranges = date_ranges(line)
        bullet = bool(re.match(r"^[●•▪◦*-]", line))
        cleaned = re.sub(r"^[●•▪◦*-]\s*", "", line).strip()
        # A non-bullet line followed by/containing a date range usually begins an entry.
        if not bullet and (ranges or (" | " in line and not current)):
            if current: entries.append(current)
            current = {"heading": cleaned, "date_range": ranges[0] if ranges else None, "details": []}
        elif bullet:
            if current is None: current = {"heading": None, "date_range": None, "details": []}
            current["details"].append(cleaned)
        elif current is not None:
            if current["date_range"] is None and ranges: current["date_range"] = ranges[0]
            elif current["details"]: current["details"][-1] += " " + cleaned
            else: current["heading"] = ((current["heading"] or "") + " " + cleaned).strip()
        else:
            current = {"heading": cleaned, "date_range": ranges[0] if ranges else None, "details": []}
    if current: entries.append(current)
    return entries


def list_items(text: str) -> list[str]:
    if not text: return []
    items = split_bullets(text)
    return items if len(items) > 1 else [line.strip() for line in text.splitlines() if line.strip()]


def classify_links(links: list[dict[str, str]]) -> dict[str, Any]:
    result: dict[str, Any] = {"linkedin": None, "github": None, "leetcode": None, "portfolio": None, "other": []}
    for link in links:
        url = link["url"]; value = (link["label"] + " " + url).lower()
        if "linkedin" in value: result["linkedin"] = url
        elif "github" in value: result["github"] = url
        elif "leetcode" in value: result["leetcode"] = url
        elif "portfolio" in value: result["portfolio"] = url
        else: result["other"].append(link)
    return result


def parse_resume(resume_file: str, enable_ocr: bool = True, include_raw_text: bool = True) -> dict[str, Any]:
    path = Path(resume_file).expanduser().resolve()
    text, pages, warnings, links_raw = extract_source(path, enable_ocr)
    sections, header = split_sections(text)
    emails = extract_emails(header or text[:1200]); phones = extract_phones(header or text[:1200])
    name, name_conf, name_evidence = guess_name(header)
    links = classify_links(links_raw)
    skills, skill_evidence = extract_canonical_skills(sections.get("skills", ""), text)
    declared_categories = extract_declared_skill_categories(sections.get("skills", ""))

    if not name: warnings.append("Name was not identified confidently")
    if not emails: warnings.append("Email was not found")
    if not phones: warnings.append("Phone number was not found")
    if "skills" not in sections: warnings.append("A skills section was not detected; skill extraction used the full document")
    if any(page.method == "ocr" for page in pages): warnings.append("OCR was used; manually review fields because OCR can introduce errors")
    duplicate_sections = []

    result: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "source": {
            "file_name": path.name,
            "file_type": path.suffix.lower(),
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "page_count": len(pages),
            "page_extraction": [page.__dict__ for page in pages],
            "external_services_used": False,
        },
        "candidate": {
            "name": name,
            "emails": emails,
            "phones": phones,
            "links": links,
        },
        "summary": sections.get("summary"),
        "skills": {
            "canonical": skills,
            "declared_categories": declared_categories,
            "evidence": skill_evidence,
        },
        "experience": structured_entries(sections.get("experience", ""), "experience"),
        "projects": structured_entries(sections.get("projects", ""), "projects"),
        "education": structured_entries(sections.get("education", ""), "education"),
        "certifications": list_items(sections.get("certifications", "")),
        "achievements": list_items(sections.get("achievements", "")),
        "additional_sections": {k: v for k, v in sections.items() if k not in {"summary", "skills", "experience", "projects", "education", "certifications", "achievements"}},
        "confidence": {
            "name": name_conf,
            "email": 0.99 if len(emails) == 1 else (0.75 if emails else 0.0),
            "phone": 0.96 if len(phones) == 1 else (0.72 if phones else 0.0),
            "sections": 0.95 if len(sections) >= 3 else 0.65,
            "skills": 0.93 if "skills" in sections and skills else (0.65 if skills else 0.0),
        },
        "evidence": {"name": name_evidence, "section_names": list(sections), "embedded_links": links_raw},
        "warnings": dedupe(warnings),
    }
    if include_raw_text: result["raw_text"] = text
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Production-oriented local multi-format resume parser")
    parser.add_argument("resume", help="Path to PDF, DOCX, DOC, ODT, RTF, TXT, or resume image")
    parser.add_argument("--output", "-o", help="Write JSON to this file")
    parser.add_argument("--pretty", action="store_true", help="Pretty JSON")
    parser.add_argument("--no-ocr", action="store_true", help="Disable OCR fallback")
    parser.add_argument("--no-raw-text", action="store_true", help="Exclude raw text from JSON")
    args = parser.parse_args()
    try:
        result = parse_resume(args.resume, enable_ocr=not args.no_ocr, include_raw_text=not args.no_raw_text)
    except (FileNotFoundError, ValueError, pymupdf.FileDataError) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr); return 2
    payload = json.dumps(result, indent=2 if args.pretty else None, ensure_ascii=False)
    if args.output: Path(args.output).write_text(payload + "\n", encoding="utf-8")
    else: print(payload)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
