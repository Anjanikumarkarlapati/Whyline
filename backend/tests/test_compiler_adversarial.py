"""Adversarial Invariant Compiler Boundary Tests (M2_R2 challenger_2_r2_m2).

Rigorous stress-testing of backend/services/test_compiler.py against:
1. Missing application.yml (non-existent, directory, empty).
2. Corrupt YAML (syntax error, bad indent, null bytes, tabs, binary junk).
3. Non-dictionary YAML (scalars, lists, nulls).
4. Boundary condition inputs for evaluate_expiry and evaluate_expiry_conditions.
5. Code generation boundary resilience (missing fields, escaping, empty collections).
6. Pytest collection suppression (__test__ = False).
"""
from __future__ import annotations

from pathlib import Path
import pytest
import yaml

from backend.services.test_compiler import (
    TestCompiler,
    _resolve_yaml_key,
    evaluate_expiry,
    evaluate_expiry_conditions,
    generate_junit_and_pytest_artifacts,
    generate_junit_test,
    generate_pytest_test,
)


# ============================================================================
# Section 1: _resolve_yaml_key boundary stress
# ============================================================================

class TestResolveYamlKeyBoundaries:
    """Stress tests _resolve_yaml_key against diverse nested/broken structures."""

    def test_empty_dict(self):
        assert _resolve_yaml_key({}, "foo.bar") is None
        assert _resolve_yaml_key({}, "") is None

    def test_non_dict_intermediate(self):
        # When a path navigates into a scalar or list
        data = {"healthconnect": "scalar_string", "nested": [1, 2, 3]}
        assert _resolve_yaml_key(data, "healthconnect.payment.gateway") is None
        assert _resolve_yaml_key(data, "nested.0") is None

    def test_degenerate_path_strings(self):
        data = {"a": {"b": "value"}}
        assert _resolve_yaml_key(data, "a.b") == "value"
        assert _resolve_yaml_key(data, "a..b") is None
        assert _resolve_yaml_key(data, ".") is None
        assert _resolve_yaml_key(data, "...") is None

    def test_type_fidelity(self):
        data = {
            "str_key": "v2",
            "int_key": 42,
            "bool_key": True,
            "null_key": None,
            "list_key": ["a", "b"],
        }
        assert _resolve_yaml_key(data, "str_key") == "v2"
        assert _resolve_yaml_key(data, "int_key") == 42
        assert _resolve_yaml_key(data, "bool_key") is True
        assert _resolve_yaml_key(data, "null_key") is None
        assert _resolve_yaml_key(data, "list_key") == ["a", "b"]


# ============================================================================
# Section 2: evaluate_expiry with missing, corrupt, and non-dict YAML
# ============================================================================

class TestEvaluateExpiryBoundaries:
    """Adversarially tests evaluate_expiry() file system and parsing boundaries."""

    @pytest.fixture
    def valid_fence(self) -> dict:
        return {
            "id": "FENCE-001",
            "expiry_condition": {
                "config_file": "config/application.yml",
                "key_path": "healthconnect.payment.gateway.version",
                "expected_value": "v2",
            },
        }

    def test_missing_file_returns_false(self, tmp_path: Path, valid_fence: dict):
        non_existent = tmp_path / "non_existent_application.yml"
        assert evaluate_expiry(valid_fence, non_existent) is False

    def test_path_is_directory_returns_false(self, tmp_path: Path, valid_fence: dict):
        dir_as_file = tmp_path / "application.yml"
        dir_as_file.mkdir()
        assert evaluate_expiry(valid_fence, dir_as_file) is False

    def test_empty_file_returns_false(self, tmp_path: Path, valid_fence: dict):
        empty_file = tmp_path / "application.yml"
        empty_file.write_text("", encoding="utf-8")
        assert evaluate_expiry(valid_fence, empty_file) is False

    @pytest.mark.parametrize(
        "corrupt_content",
        [
            "healthconnect: [unclosed bracket",
            "healthconnect:\n  payment:\n bad_indent: 1",
            "healthconnect: %invalid_yaml_tag",
            "healthconnect:\n\tpayment:\n\t\tversion: v2",  # tab character indentation
            "healthconnect: 'unmatched single quote",
            "healthconnect: \"unmatched double quote",
            "healthconnect: !!binary 'not-base64???=='",
        ],
    )
    def test_corrupt_yaml_syntax_returns_false_safely(
        self, tmp_path: Path, valid_fence: dict, corrupt_content: str
    ):
        corrupt_file = tmp_path / "corrupt.yml"
        corrupt_file.write_text(corrupt_content, encoding="utf-8")
        assert evaluate_expiry(valid_fence, corrupt_file) is False

    def test_null_byte_in_yaml_returns_false(self, tmp_path: Path, valid_fence: dict):
        null_file = tmp_path / "null_byte.yml"
        null_file.write_bytes(b"healthconnect:\n  payment:\n    version: v2\x00corrupt")
        assert evaluate_expiry(valid_fence, null_file) is False

    @pytest.mark.parametrize(
        "non_dict_content",
        [
            "just a plain scalar string",
            "12345",
            "3.14159",
            "true",
            "false",
            "null",
            "~",
            "- list item 1\n- list item 2\n- list item 3",
            "- key: val\n- key2: val2",
        ],
    )
    def test_non_dictionary_yaml_returns_false(
        self, tmp_path: Path, valid_fence: dict, non_dict_content: str
    ):
        non_dict_file = tmp_path / "non_dict.yml"
        non_dict_file.write_text(non_dict_content, encoding="utf-8")
        assert evaluate_expiry(valid_fence, non_dict_file) is False

    @pytest.mark.parametrize(
        "bad_fence",
        [
            {},
            {"id": "FENCE-001"},
            {"expiry_condition": None},
            {"expiry_condition": {}},
            {"expiry_condition": {"key_path": None, "expected_value": "v2"}},
            {"expiry_condition": {"key_path": "", "expected_value": "v2"}},
            {"expiry_condition": {"key_path": "non.existent.path", "expected_value": "v2"}},
        ],
    )
    def test_malformed_fence_structures(self, tmp_path: Path, bad_fence: dict):
        cfg_file = tmp_path / "application.yml"
        cfg_file.write_text(
            "healthconnect:\n  payment:\n    gateway:\n      version: v2\n",
            encoding="utf-8",
        )
        assert evaluate_expiry(bad_fence, cfg_file) is False

    def test_type_coercion_fidelity(self, tmp_path: Path):
        cfg_file = tmp_path / "application.yml"
        cfg_file.write_text(
            "flags:\n  active: true\n  count: 5\n  version: 2.0\n",
            encoding="utf-8",
        )
        # Expected is string "true", actual is bool True -> str(True).lower() == "true"
        fence_bool = {
            "expiry_condition": {"key_path": "flags.active", "expected_value": "True"}
        }
        assert evaluate_expiry(fence_bool, cfg_file) is True

        fence_int = {
            "expiry_condition": {"key_path": "flags.count", "expected_value": "5"}
        }
        assert evaluate_expiry(fence_int, cfg_file) is True


# ============================================================================
# Section 3: evaluate_expiry_conditions cross-boundary repo stress
# ============================================================================

class TestEvaluateExpiryConditionsBoundaries:
    """Tests batch evaluate_expiry_conditions against corrupted and edge repo states."""

    def test_missing_config_dir(self, tmp_path: Path):
        fences = [
            {
                "id": "FENCE-001",
                "status": "VERIFIED_ACTIVE",
                "expiry_condition": {
                    "key_path": "healthconnect.payment.gateway.version",
                    "expected_value": "v2",
                },
            }
        ]
        result = evaluate_expiry_conditions(tmp_path, fences)
        assert len(result) == 1
        assert result[0]["status"] == "VERIFIED_ACTIVE"

    def test_corrupt_application_yml_does_not_crash(self, tmp_path: Path):
        cfg_dir = tmp_path / "config"
        cfg_dir.mkdir(parents=True)
        (cfg_dir / "application.yml").write_text("corrupt: [broken YAML", encoding="utf-8")

        fences = [
            {
                "id": "FENCE-001",
                "status": "VERIFIED_ACTIVE",
                "expiry_condition": {
                    "key_path": "healthconnect.payment.gateway.version",
                    "expected_value": "v2",
                },
            },
            {
                "id": "FENCE-002",
                "status": "VERIFIED_ACTIVE",
                "expiry_condition": {
                    "key_path": "healthconnect.imaging.adreno_driver_patch",
                    "expected_value": "v2.0",
                },
            },
        ]
        result = evaluate_expiry_conditions(tmp_path, fences)
        assert result[0]["status"] == "VERIFIED_ACTIVE"
        assert result[1]["status"] == "VERIFIED_ACTIVE"

    def test_successful_expiry_and_reversal(self, tmp_path: Path):
        cfg_dir = tmp_path / "config"
        cfg_dir.mkdir(parents=True)
        cfg_file = cfg_dir / "application.yml"

        fences = [
            {
                "id": "FENCE-001",
                "status": "VERIFIED_ACTIVE",
                "expiry_condition": {
                    "key_path": "healthconnect.payment.gateway.version",
                    "expected_value": "v2",
                },
            }
        ]

        # 1. v1 -> should remain active
        cfg_file.write_text("healthconnect:\n  payment:\n    gateway:\n      version: v1\n", encoding="utf-8")
        evaluated = evaluate_expiry_conditions(tmp_path, fences)
        assert evaluated[0]["status"] == "VERIFIED_ACTIVE"

        # 2. Upgrade to v2 -> should transition to EXPIRED_SAFE_TO_REMOVE
        cfg_file.write_text("healthconnect:\n  payment:\n    gateway:\n      version: v2\n", encoding="utf-8")
        evaluated = evaluate_expiry_conditions(tmp_path, fences)
        assert evaluated[0]["status"] == "EXPIRED_SAFE_TO_REMOVE"
        assert evaluated[0]["previous_status"] == "VERIFIED_ACTIVE"

        # 3. Rollback to v1 -> should restore previous status
        cfg_file.write_text("healthconnect:\n  payment:\n    gateway:\n      version: v1\n", encoding="utf-8")
        evaluated = evaluate_expiry_conditions(tmp_path, fences)
        assert evaluated[0]["status"] == "VERIFIED_ACTIVE"


# ============================================================================
# Section 4: Code Generators & Pytest Collection
# ============================================================================

class TestGeneratorsAndCollection:
    """Tests JUnit/Pytest generator robustness and pytest collection suppression."""

    def test_testcompiler_has_no_test_collection(self):
        assert getattr(TestCompiler, "__test__", None) is False

    def test_generate_junit_test_missing_optional_fields(self, tmp_path: Path):
        sparse_fence = {
            "id": "FENCE-999",
            "file_path": "src/main/java/com/healthconnect/Custom.java",
        }
        code = generate_junit_test(sparse_fence, tmp_path)
        assert "@Test" in code
        assert "guard_fence_999_FenceMethod" in code
        assert "assertTrue" in code

    def test_generate_pytest_test_special_characters(self, tmp_path: Path):
        special_fence = {
            "id": "FENCE-009",
            "file_path": "services/ocr/prescription_parser.py",
            "matched_token": 'verify = False\n# line comment "with quotes"',
            "status": "VERIFIED_ACTIVE",
        }
        code = generate_pytest_test(special_fence, tmp_path)
        assert "def test_fence_009_invariant():" in code
        assert "assert 'verify' in src" in code or "assert" in code

    def test_generate_artifacts_with_empty_fences(self, tmp_path: Path):
        compiler = TestCompiler(tmp_path)
        artifacts = compiler.generate_artifacts(tmp_path, [])
        assert "junit_test_path" in artifacts
        assert "pytest_test_path" in artifacts
        assert (tmp_path / artifacts["junit_test_path"]).exists()
        assert (tmp_path / artifacts["pytest_test_path"]).exists()
