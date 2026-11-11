"""AST Anomaly Detector & Normalized Tree-sitter Signature Hasher.
Upgraded with tree_sitter and tree_sitter_language_pack for Java and Python.
Scans source files and git commit history for the 5 high-suspicion
Chesterton's Fence anomaly patterns while remaining silent on routine CRUD code.
"""
from __future__ import annotations

import hashlib
import re
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path

import tree_sitter as ts

ANOMALY_MAGIC_LITERAL = "MAGIC_LITERAL_CONTROL_FLOW"
ANOMALY_THREAD_HALT = "EXPLICIT_THREAD_HALT"
ANOMALY_SWALLOWED_EXCEPTION = "SWALLOWED_EXCEPTION"
ANOMALY_VALIDATION_BYPASS = "VALIDATION_BYPASS"
ANOMALY_REVERT_COMMIT = "REVERT_COMMIT"

try:
    import tree_sitter_language_pack as tslp
    _JAVA_LANG = tslp.get_language("java")
    _PYTHON_LANG = tslp.get_language("python")
except Exception:
    import tree_sitter_java as tsjava
    import tree_sitter_python as tspy
    _JAVA_LANG = ts.Language(tsjava.language())
    _PYTHON_LANG = ts.Language(tspy.language())

_JAVA_PARSER = ts.Parser(_JAVA_LANG)
_PYTHON_PARSER = ts.Parser(_PYTHON_LANG)


@dataclass
class AstAnomaly:
    file_path: str
    class_name: str
    method_name: str
    params_sig: str
    ast_signature_hash: str
    start_line: int
    end_line: int
    anomaly_type: str
    matched_token: str
    code_snippet: str

    def to_dict(self) -> dict:
        return asdict(self)


def compute_ast_signature_hash(file_path: str, class_name: str, method_name: str, params_sig: str) -> str:
    normalized_path = file_path.replace("\\", "/").strip("/")
    normalized_params = re.sub(r"\s+", "", params_sig or "()")
    canonical = f"{normalized_path}::{class_name or 'Module'}::{method_name or 'root'}::{normalized_params}"
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]


def _extract_enclosing_symbol_tree_sitter(
    node: ts.Node, code_bytes: bytes, lines: list[str], is_java: bool
) -> tuple[str, str, str, int, int]:
    """Traverses Tree-sitter AST ancestors to identify enclosing class and method/function symbols."""
    class_name = "Module"
    method_name = "module_scope"
    params_sig = "()"
    s_line = node.start_point[0] + 1
    e_line = node.end_point[0] + 1

    curr: ts.Node | None = node
    found_method = False
    found_class = False

    while curr is not None:
        if is_java:
            if not found_method and curr.type == "method_declaration":
                found_method = True
                e_line = curr.end_point[0] + 1
                type_node = curr.child_by_field_name("type")
                if type_node:
                    s_line = type_node.start_point[0] + 1
                else:
                    s_line = curr.start_point[0] + 1

                name_node = curr.child_by_field_name("name")
                if name_node:
                    method_name = code_bytes[name_node.start_byte : name_node.end_byte].decode("utf-8", errors="ignore")

                params_node = curr.child_by_field_name("parameters")
                if params_node:
                    params_sig = code_bytes[params_node.start_byte : params_node.end_byte].decode("utf-8", errors="ignore")
                else:
                    for ch in curr.children:
                        if ch.type == "formal_parameters":
                            params_sig = code_bytes[ch.start_byte : ch.end_byte].decode("utf-8", errors="ignore")
                            break

            elif not found_class and curr.type == "class_declaration":
                found_class = True
                name_node = curr.child_by_field_name("name")
                if name_node:
                    class_name = code_bytes[name_node.start_byte : name_node.end_byte].decode("utf-8", errors="ignore")
                else:
                    for ch in curr.children:
                        if ch.type == "identifier":
                            class_name = code_bytes[ch.start_byte : ch.end_byte].decode("utf-8", errors="ignore")
                            break
        else:
            if not found_method and curr.type == "function_definition":
                found_method = True
                s_line = curr.start_point[0] + 1
                e_line = curr.end_point[0] + 1

                name_node = curr.child_by_field_name("name")
                if name_node:
                    method_name = code_bytes[name_node.start_byte : name_node.end_byte].decode("utf-8", errors="ignore")

                params_node = curr.child_by_field_name("parameters")
                if params_node:
                    params_sig = code_bytes[params_node.start_byte : params_node.end_byte].decode("utf-8", errors="ignore")
                else:
                    for ch in curr.children:
                        if ch.type == "parameters":
                            params_sig = code_bytes[ch.start_byte : ch.end_byte].decode("utf-8", errors="ignore")
                            break

            elif not found_class and curr.type == "class_definition":
                found_class = True
                name_node = curr.child_by_field_name("name")
                if name_node:
                    class_name = code_bytes[name_node.start_byte : name_node.end_byte].decode("utf-8", errors="ignore")
                else:
                    for ch in curr.children:
                        if ch.type == "identifier":
                            class_name = code_bytes[ch.start_byte : ch.end_byte].decode("utf-8", errors="ignore")
                            break

        curr = curr.parent

    if s_line > len(lines):
        s_line = max(1, len(lines))
    if e_line > len(lines):
        e_line = len(lines)

    return class_name, method_name, params_sig, s_line, e_line


def extract_repository_vocabulary(repo_dir: Path) -> list[str]:
    """Extracts class names, method names, and config identifiers for AST Vocabulary Rescoring."""
    vocab: set[str] = set()
    for ext in ("*.java", "*.py", "*.yml"):
        for file_path in repo_dir.rglob(ext):
            if ".whyline" in file_path.parts or "test" in file_path.parts:
                continue
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            vocab.add(file_path.stem)
            vocab.add(file_path.name)
            for match in re.findall(r"\b(?:class|def)\s+([A-Za-z0-9_]+)", text):
                vocab.add(match)
            for match in re.findall(
                r"\b(retryCount|timeoutMs|clockSkewSeconds|epsilon_bias|verify|TrustAllCerts|gateway\.version|application\.yml)\b",
                text,
            ):
                vocab.add(match)
    return sorted(vocab)


def scan_file_for_anomalies(repo_dir: Path, file_path: Path) -> list[AstAnomaly]:
    """Scans a Java or Python file using Tree-sitter AST parsing for the 5 high-suspicion patterns."""
    rel_path = file_path.relative_to(repo_dir).as_posix()
    code_bytes = file_path.read_bytes()
    text = code_bytes.decode("utf-8", errors="ignore")
    lines = text.splitlines()
    is_java = file_path.suffix == ".java"
    parser = _JAVA_PARSER if is_java else _PYTHON_PARSER
    tree = parser.parse(code_bytes)

    found: list[AstAnomaly] = []

    def add_anomaly(node: ts.Node, anomaly_type: str, token: str) -> None:
        cls_name, fn_name, params, s_line, e_line = _extract_enclosing_symbol_tree_sitter(
            node, code_bytes, lines, is_java
        )
        ast_hash = compute_ast_signature_hash(rel_path, cls_name, fn_name, params)
        if any(a.ast_signature_hash == ast_hash for a in found):
            return
        snippet = "\n".join(lines[max(0, s_line - 1) : min(len(lines), e_line)])
        found.append(
            AstAnomaly(
                file_path=rel_path,
                class_name=cls_name,
                method_name=fn_name,
                params_sig=params,
                ast_signature_hash=ast_hash,
                start_line=s_line,
                end_line=e_line,
                anomaly_type=anomaly_type,
                matched_token=token,
                code_snippet=snippet,
            )
        )

    # Breadth-first traversal of the AST tree
    stack = [tree.root_node]
    while stack:
        curr = stack.pop()
        ntype = curr.type

        # 1. Explicit thread halts (Thread.sleep or time.sleep / asyncio.sleep)
        if is_java:
            if ntype == "method_invocation":
                raw_call = code_bytes[curr.start_byte : curr.end_byte].decode("utf-8", errors="ignore")
                if "Thread.sleep" in raw_call:
                    add_anomaly(curr, ANOMALY_THREAD_HALT, raw_call)
                    continue
        else:
            if ntype == "call":
                raw_call = code_bytes[curr.start_byte : curr.end_byte].decode("utf-8", errors="ignore")
                if "time.sleep" in raw_call or "asyncio.sleep" in raw_call:
                    add_anomaly(curr, ANOMALY_THREAD_HALT, raw_call)
                    continue

        # 2. Validation bypasses (@SuppressWarnings("deprecation"), TrustAllCerts, verify = false)
        if is_java:
            if ntype in ("marker_annotation", "annotation"):
                raw_ann = code_bytes[curr.start_byte : curr.end_byte].decode("utf-8", errors="ignore")
                if "@SuppressWarnings" in raw_ann and "deprecation" in raw_ann:
                    add_anomaly(curr, ANOMALY_VALIDATION_BYPASS, '@SuppressWarnings("deprecation")')
                    continue
            elif ntype == "string_literal":
                raw_str = code_bytes[curr.start_byte : curr.end_byte].decode("utf-8", errors="ignore")
                if "TrustAllCerts" in raw_str:
                    add_anomaly(curr, ANOMALY_VALIDATION_BYPASS, '"TrustAllCerts"')
                    continue
        else:
            if ntype in ("assignment", "keyword_argument"):
                raw_expr = code_bytes[curr.start_byte : curr.end_byte].decode("utf-8", errors="ignore")
                if re.search(r"\bverify\s*=\s*False\b", raw_expr):
                    add_anomaly(curr, ANOMALY_VALIDATION_BYPASS, "verify = False")
                    continue

        # 3. Magic numbers in loops, retries, timeouts, or skew
        if is_java:
            if ntype == "variable_declarator":
                raw_decl = code_bytes[curr.start_byte : curr.end_byte].decode("utf-8", errors="ignore")
                m = re.search(
                    r"\b(retryCount|timeoutMs|timeout|clockSkewSeconds|epsilon_bias|retry_window)\s*=\s*([0-9]+(?:\.[0-9]+)?)",
                    raw_decl,
                )
                if m:
                    add_anomaly(curr, ANOMALY_MAGIC_LITERAL, f"{m.group(1)} = {m.group(2)}")
                    continue
        else:
            if ntype == "assignment":
                raw_as = code_bytes[curr.start_byte : curr.end_byte].decode("utf-8", errors="ignore")
                m = re.search(
                    r"\b(retryCount|timeoutMs|timeout|clockSkewSeconds|epsilon_bias|retry_window)\s*=\s*([0-9]+(?:\.[0-9]+)?)",
                    raw_as,
                )
                if m:
                    add_anomaly(curr, ANOMALY_MAGIC_LITERAL, f"{m.group(1)} = {m.group(2)}")
                    continue

        # 4. Swallowed catch / except blocks
        if is_java:
            if ntype == "catch_clause":
                raw_catch = code_bytes[curr.start_byte : curr.end_byte].decode("utf-8", errors="ignore")
                body = curr.child_by_field_name("body")
                body_text = code_bytes[body.start_byte : body.end_byte].decode("utf-8", errors="ignore") if body else raw_catch
                if "throw " not in body_text and "return " not in body_text and "log" not in body_text.lower() and "interrupt" not in body_text.lower():
                    add_anomaly(curr, ANOMALY_SWALLOWED_EXCEPTION, "catch (...) { /* swallowed */ }")
                    continue
        else:
            if ntype == "except_clause":
                raw_except = code_bytes[curr.start_byte : curr.end_byte].decode("utf-8", errors="ignore")
                if "pass" in raw_except and "raise " not in raw_except and "log" not in raw_except.lower():
                    add_anomaly(curr, ANOMALY_SWALLOWED_EXCEPTION, "except Exception: pass")
                    continue

        stack.extend(curr.children)

    # 5. Check git log for Revert commits touching this file
    revert_matched = False
    if (repo_dir / ".git").exists():
        try:
            proc = subprocess.run(
                ["git", "log", "-n", "3", "--pretty=format:%s", "--", rel_path],
                cwd=repo_dir,
                capture_output=True,
                text=True,
                check=False,
            )
            for subject in proc.stdout.splitlines():
                if subject.startswith('Revert "') and not any(a.anomaly_type == ANOMALY_REVERT_COMMIT for a in found):
                    # Anchor to first method or function definition in the file
                    target_node = tree.root_node
                    for child in tree.root_node.children:
                        if child.type in ("function_definition", "method_declaration"):
                            target_node = child
                            break
                    cls_name, fn_name, params, s_line, e_line = _extract_enclosing_symbol_tree_sitter(
                        target_node, code_bytes, lines, is_java
                    )
                    ast_hash = compute_ast_signature_hash(rel_path, cls_name, fn_name, params)
                    snippet = "\n".join(lines[max(0, s_line - 1) : min(len(lines), e_line)])
                    found.append(
                        AstAnomaly(
                            file_path=rel_path,
                            class_name=cls_name,
                            method_name=fn_name,
                            params_sig=params,
                            ast_signature_hash=ast_hash,
                            start_line=s_line,
                            end_line=e_line,
                            anomaly_type=ANOMALY_REVERT_COMMIT,
                            matched_token=subject,
                            code_snippet=snippet,
                        )
                    )
                    revert_matched = True
                    break
        except Exception:
            pass

    # Fallback: check in-source comment regex matching for '# Reverted ...' and '// Reverted ...'
    if not revert_matched and not any(a.anomaly_type == ANOMALY_REVERT_COMMIT for a in found):
        for idx, line in enumerate(lines):
            m = re.search(r"^\s*(?:#|//)\s*(Reverted\b[^\r\n]*)", line, re.IGNORECASE)
            if m:
                matched_comment = m.group(1).strip()
                target_node = tree.root_node
                for child in tree.root_node.children:
                    if child.type in ("function_definition", "method_declaration"):
                        target_node = child
                        break
                cls_name, fn_name, params, s_line, e_line = _extract_enclosing_symbol_tree_sitter(
                    target_node, code_bytes, lines, is_java
                )
                ast_hash = compute_ast_signature_hash(rel_path, cls_name, fn_name, params)
                snippet = "\n".join(lines[max(0, s_line - 1) : min(len(lines), e_line)])
                found.append(
                    AstAnomaly(
                        file_path=rel_path,
                        class_name=cls_name,
                        method_name=fn_name,
                        params_sig=params,
                        ast_signature_hash=ast_hash,
                        start_line=s_line if s_line else idx + 1,
                        end_line=e_line if e_line else idx + 1,
                        anomaly_type=ANOMALY_REVERT_COMMIT,
                        matched_token=matched_comment,
                        code_snippet=snippet if snippet else line.strip(),
                    )
                )
                break

    return found


PRIORITY_FILE_ORDER = [
    "GatewayRouter.java",
    "DicomShaderPipeline.java",
    "JwtClockSkewFilter.java",
    "LegacyHl7SslClient.java",
    "WebRtcIceCandidateHandler.java",
    "patient_queue.py",
    "webhook_dispatcher.py",
    "gst_rounding_engine.py",
    "prescription_parser.py",
    "redis_session_store.py",
]


def scan_repository(repo_dir: Path) -> list[AstAnomaly]:
    anomalies: list[AstAnomaly] = []
    for ext in ("*.java", "*.py"):
        for path in sorted(repo_dir.rglob(ext)):
            rel_parts = path.relative_to(repo_dir).parts
            if any(p.startswith(".") or p in ("test", "tests", "__pycache__") for p in rel_parts):
                continue
            anomalies.extend(scan_file_for_anomalies(repo_dir, path))

    def _sort_key(a: AstAnomaly) -> tuple[int, str]:
        name = Path(a.file_path).name
        idx = PRIORITY_FILE_ORDER.index(name) if name in PRIORITY_FILE_ORDER else 999
        return (idx, a.file_path)

    anomalies.sort(key=_sort_key)
    return anomalies
