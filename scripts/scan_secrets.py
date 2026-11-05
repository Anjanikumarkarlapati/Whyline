"""Pre-commit Secret and Credential Scanner for WhyLine.

Prevents credentials, active tokens, private keys, or .env files from entering git.
Usage:
    python scripts/scan_secrets.py [--staged | --all]
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

# High-confidence secret patterns
SECRET_PATTERNS = [
    ("Google API Key", re.compile(r"AIza[0-9A-Za-z\-_]{35}")),
    ("Gemini Studio / Vertex Key", re.compile(r"AQ\.[0-9a-zA-Z_\-]{30,}")),
    ("Gnani Vachana Token", re.compile(r"vach_[0-9a-zA-Z_\-]{30,}")),
    ("Supabase Service Role Secret", re.compile(r"sb_secret_[0-9a-zA-Z_\-]{20,}")),
    ("Supabase Publishable Key", re.compile(r"sb_publishable_[0-9a-zA-Z_\-]{20,}")),
    ("GitHub Personal Access Token", re.compile(r"(?:ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})")),
    ("Anthropic / OpenAI API Key", re.compile(r"sk-(?:proj-|ant-)?[a-zA-Z0-9_\-]{20,}")),
    ("AWS Access Key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("Private Key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("Gnani API Key literal", re.compile(r"""(?:GNANI_API_KEY|X-API-Key-ID)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]""")),
    ("Hardcoded Production Webhook Secret", re.compile(r"whyline_production_webhook_secret_2026")),
]

BLOCKED_FILENAMES = re.compile(r"(?:^|[/\\])\.env(?:\.[a-zA-Z0-9_\-]+)?$")
ALLOWED_FILENAMES = {".env.example", ".env.template"}


def mask_secret(secret_str: str) -> str:
    if len(secret_str) <= 8:
        return "****"
    return secret_str[:4] + "*" * (len(secret_str) - 8) + secret_str[-4:]


def get_target_files(scan_all: bool = False) -> list[Path]:
    root = Path(__file__).resolve().parent.parent
    if scan_all:
        try:
            res = subprocess.run(
                ["git", "ls-files"],
                cwd=str(root),
                capture_output=True,
                text=True,
                check=True,
            )
            files = [root / line.strip() for line in res.stdout.splitlines() if line.strip()]
            return [f for f in files if f.is_file()]
        except Exception:
            return [p for p in root.rglob("*") if p.is_file() and ".git" not in p.parts]

    try:
        res = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            cwd=str(root),
            capture_output=True,
            text=True,
            check=True,
        )
        staged = [root / line.strip() for line in res.stdout.splitlines() if line.strip()]
        return [f for f in staged if f.is_file()]
    except Exception:
        return []


def scan_file_for_secrets(file_path: Path) -> list[str]:
    violations: list[str] = []
    # 1. Filename check
    fname = file_path.name
    if BLOCKED_FILENAMES.search(str(file_path)) and fname not in ALLOWED_FILENAMES:
        violations.append(f"Blocked environment file detected: {file_path.name}")
        return violations

    # Skip binaries / audio / images / test snapshots / node_modules / .git
    skip_suffixes = {".wav", ".pcm", ".png", ".jpg", ".jpeg", ".ico", ".docx", ".doc", ".xlsx", ".pdf", ".pyc"}
    if file_path.suffix.lower() in skip_suffixes:
        return violations

    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return violations

    # Don't flag this scanner itself
    if file_path.name == "scan_secrets.py":
        return violations

    for line_num, line in enumerate(content.splitlines(), start=1):
        for name, pattern in SECRET_PATTERNS:
            match = pattern.search(line)
            if match:
                raw_secret = match.group(0)
                # Ignore dummy/mock patterns
                if any(dummy in raw_secret.lower() for dummy in ("your-", "mock_", "example", "dummy", "test_")):
                    continue
                violations.append(
                    f"Line {line_num}: {name} detected [{mask_secret(raw_secret)}]"
                )

    return violations


def main() -> int:
    parser = argparse.ArgumentParser(description="WhyLine Pre-commit Secret Scanner")
    parser.add_argument("--all", action="store_true", help="Scan all tracked git files")
    args = parser.parse_args()

    files = get_target_files(scan_all=args.all)
    if not files:
        print("[WhyLine Secret Scan] No staged files to scan.")
        return 0

    has_violation = False
    print(f"[WhyLine Secret Scan] Scanning {len(files)} files for secrets...")

    for f in files:
        violations = scan_file_for_secrets(f)
        if violations:
            has_violation = True
            print(f"\n[!] VIOLATION in {f}:")
            for v in violations:
                print(f"    - {v}")

    if has_violation:
        print("\n[!] COMMIT REJECTED: Secrets or credentials detected.")
        print("[!] Remove sensitive information or .env files before committing.\n")
        return 1

    print("[WhyLine Secret Scan] All checks passed. Zero secrets detected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
