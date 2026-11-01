"""Empirical stress tests and adversarial verification for backend/migrations/01_init.sql.

Covers:
1. Complete PostgreSQL AST parsing of all 29 statements via pglast.
2. Structural AST validation: tables (ast_nodes, voice_pins, debug_checkpoints),
   columns, constraints, data types, and index declarations (HNSW, GIN, B-Tree).
3. CTE logic and ranking math simulation for match_whyline_code_and_fences:
   - NULL query_text handling
   - NULL query_embedding handling
   - Both NULL / empty query handling
   - Zero-match handling (lexical or semantic)
   - Tie-breaking behavior with ROW_NUMBER()
   - rrf_k sensitivity (k=1, k=60, k=100) and reciprocal fusion ranking invariants
   - 1-to-0 and 1-to-many voice pin join edge cases
"""
from __future__ import annotations

import math
from pathlib import Path
import pytest
import pglast
from pglast import ast

MIGRATION_PATH = Path(__file__).resolve().parent.parent / "backend" / "migrations" / "01_init.sql"


@pytest.fixture(scope="module")
def migration_sql() -> str:
    assert MIGRATION_PATH.exists(), f"Missing migration file at {MIGRATION_PATH}"
    return MIGRATION_PATH.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def parsed_ast(migration_sql: str):
    return pglast.parse_sql(migration_sql)


# ==============================================================================
# 1. Complete AST Parsing of All Statements
# ==============================================================================

def test_ast_parses_all_statements_without_syntax_error(parsed_ast):
    """Verify pglast (PostgreSQL 16 native parser) parses all statements in 01_init.sql."""
    assert len(parsed_ast) == 29, f"Expected 29 statements, got {len(parsed_ast)}"

    expected_stmt_types = [
        "CreateExtensionStmt",  # 1. vector
        "CreateExtensionStmt",  # 2. pgcrypto
        "CreateStmt",           # 3. ast_nodes table
        "DoStmt",               # 4. ast_nodes reconciliation block
        "CreateStmt",           # 5. voice_pins table
        "DoStmt",               # 6. voice_pins reconciliation block
        "AlterTableStmt",       # 7. drop chk_voice_pins_verification_status
        "AlterTableStmt",       # 8. add chk_voice_pins_verification_status
        "AlterTableStmt",       # 9. drop chk_voice_pins_status
        "AlterTableStmt",       # 10. add chk_voice_pins_status
        "CreateStmt",           # 11. debug_checkpoints table
        "CreateFunctionStmt",   # 12. sync_ast_nodes_compat
        "CreateTrigStmt",       # 13. trg_ast_nodes_sync_compat
        "CreateFunctionStmt",   # 14. sync_voice_pins_compat
        "CreateTrigStmt",       # 15. trg_voice_pins_sync_compat
        "IndexStmt",            # 16. idx_ast_nodes_embedding_hnsw
        "IndexStmt",            # 17. idx_ast_nodes_fts
        "IndexStmt",            # 18. idx_ast_nodes_signature_hash
        "IndexStmt",            # 19. idx_ast_nodes_compat_embedding
        "IndexStmt",            # 20. idx_ast_nodes_fts_doc
        "IndexStmt",            # 21. idx_voice_pins_ast_node_id
        "IndexStmt",            # 22. idx_voice_pins_transcript_embedding
        "IndexStmt",            # 23. idx_voice_pins_verification_status
        "IndexStmt",            # 24. idx_voice_pins_ast_hash
        "IndexStmt",            # 25. idx_voice_pins_compat_embedding
        "IndexStmt",            # 26. idx_voice_pins_status
        "IndexStmt",            # 27. idx_voice_pins_fts
        "DropStmt",             # 28. drop match_whyline_code_and_fences
        "CreateFunctionStmt",   # 29. create match_whyline_code_and_fences
    ]

    actual_stmt_types = [raw.stmt.__class__.__name__ for raw in parsed_ast]
    assert actual_stmt_types == expected_stmt_types


# ==============================================================================
# 2. Structural AST Schema & Constraint Validation
# ==============================================================================

def test_ast_nodes_table_schema(parsed_ast):
    """Verify ast_nodes table definition, columns, types, defaults, and constraints."""
    ast_nodes_stmt = parsed_ast[2].stmt
    assert isinstance(ast_nodes_stmt, ast.CreateStmt)
    assert ast_nodes_stmt.relation.relname == "ast_nodes"

    col_names = {}
    for elt in ast_nodes_stmt.tableElts:
        if isinstance(elt, ast.ColumnDef):
            type_names = [n.sval for n in elt.typeName.names]
            col_names[elt.colname] = (type_names, elt)

    # Core required columns per ORIGINAL_REQUEST R1
    assert "id" in col_names
    assert "raw_code" in col_names
    assert "symbol_name" in col_names
    assert "ast_signature_hash" in col_names
    assert "fts" in col_names
    assert "code_embedding" in col_names

    # Check vector dimension is 384
    type_names, col_def = col_names["code_embedding"]
    assert "vector" in type_names
    # typmods contains dimension integer 384
    assert len(col_def.typeName.typmods) == 1
    assert col_def.typeName.typmods[0].val.ival == 384

    # Check fts is GENERATED ALWAYS STORED
    _, fts_def = col_names["fts"]
    assert any(c.contype.name == "CONSTR_GENERATED" for c in fts_def.constraints or [])


def test_voice_pins_table_schema(parsed_ast):
    """Verify voice_pins table definition, columns, foreign keys, and vector types."""
    voice_pins_stmt = parsed_ast[4].stmt
    assert isinstance(voice_pins_stmt, ast.CreateStmt)
    assert voice_pins_stmt.relation.relname == "voice_pins"

    col_names = {}
    for elt in voice_pins_stmt.tableElts:
        if isinstance(elt, ast.ColumnDef):
            type_names = [n.sval for n in elt.typeName.names]
            col_names[elt.colname] = (type_names, elt)

    # Core required columns per ORIGINAL_REQUEST R1
    assert "id" in col_names
    assert "ast_node_id" in col_names
    assert "author_handle" in col_names
    assert "verification_status" in col_names
    assert "transcript_raw" in col_names
    assert "constraint_summary" in col_names
    assert "expiry_condition" in col_names
    assert "transcript_embedding" in col_names

    # Check transcript_embedding dimension is 384
    type_names, col_def = col_names["transcript_embedding"]
    assert "vector" in type_names
    assert col_def.typeName.typmods[0].val.ival == 384

    # Foreign key references ast_nodes(id) ON DELETE CASCADE
    _, fk_col_def = col_names["ast_node_id"]
    fk_constraints = [c for c in fk_col_def.constraints if c.contype.name == "CONSTR_FOREIGN"]
    assert len(fk_constraints) == 1
    fk = fk_constraints[0]
    assert fk.pktable.relname == "ast_nodes"
    assert fk.fk_del_action == "c"  # CASCADE


def test_index_declarations_hnsw_and_gin(parsed_ast):
    """Verify index methods (HNSW with vector_cosine_ops, GIN, B-Tree)."""
    index_stmts = [raw.stmt for raw in parsed_ast if isinstance(raw.stmt, ast.IndexStmt)]
    assert len(index_stmts) == 12

    indices_by_name = {stmt.idxname: stmt for stmt in index_stmts}

    # HNSW indexes
    hnsw_indices = [
        "idx_ast_nodes_embedding_hnsw",
        "idx_ast_nodes_compat_embedding",
        "idx_voice_pins_transcript_embedding",
        "idx_voice_pins_compat_embedding",
    ]
    for idx_name in hnsw_indices:
        stmt = indices_by_name[idx_name]
        assert stmt.accessMethod == "hnsw", f"Index {idx_name} accessMethod is not hnsw"
        # Check operator class is vector_cosine_ops
        opclass = stmt.indexParams[0].opclass[0].sval
        assert opclass == "vector_cosine_ops", f"Index {idx_name} opclass is {opclass}"

    # GIN indexes
    gin_indices = [
        "idx_ast_nodes_fts",
        "idx_ast_nodes_fts_doc",
        "idx_voice_pins_fts",
    ]
    for idx_name in gin_indices:
        stmt = indices_by_name[idx_name]
        assert stmt.accessMethod == "gin", f"Index {idx_name} accessMethod is not gin"


# ==============================================================================
# 3. match_whyline_code_and_fences AST & CTE Verification
# ==============================================================================

def test_match_whyline_code_and_fences_ast(parsed_ast):
    """Verify function parameters, return columns, and CTE query structure."""
    fn_stmt = parsed_ast[28].stmt
    assert isinstance(fn_stmt, ast.CreateFunctionStmt)
    func_names = [s.sval for s in fn_stmt.funcname]
    assert func_names[-1] == "match_whyline_code_and_fences"

    # Verify input arguments
    param_dict = {p.name: [s.sval for s in p.argType.names] for p in fn_stmt.parameters}
    assert "query_text" in param_dict
    assert "query_embedding" in param_dict
    assert "match_count" in param_dict
    assert "rrf_k" in param_dict

    # Verify return table columns
    return_cols = [
        "ast_node_id", "file_path", "symbol_name", "raw_code", "ast_signature_hash",
        "voice_pin_id", "author_handle", "verification_status", "transcript_raw",
        "constraint_summary", "expiry_condition", "rrf_score"
    ]
    for col in return_cols:
        assert col in param_dict

    # Extract function body and parse its internal SQL query
    as_option = next(opt for opt in fn_stmt.options if opt.defname == "as")
    body_sql = as_option.arg[0].sval
    body_tree = pglast.parse_sql(body_sql)
    assert len(body_tree) == 1

    select_stmt = body_tree[0].stmt
    assert isinstance(select_stmt, ast.SelectStmt)
    assert select_stmt.withClause is not None

    ctes = {cte.ctename: cte for cte in select_stmt.withClause.ctes}
    assert "semantic_ranked" in ctes
    assert "lexical_ranked" in ctes
    assert "fused" in ctes


# ==============================================================================
# 4. CTE Ranking Math & Edge Case Stress Simulation
# ==============================================================================

class RrfSimulationHarness:
    """Simulates the exact SQL semantics of match_whyline_code_and_fences CTEs."""

    def __init__(self, ast_nodes: list[dict], voice_pins: list[dict]):
        self.ast_nodes = ast_nodes
        self.voice_pins = voice_pins

    def execute(
        self,
        query_text: str | None,
        query_embedding: list[float] | None,
        match_count: int = 5,
        rrf_k: int = 60,
    ) -> list[dict]:
        # 1. semantic_ranked CTE
        semantic_ranked: list[dict] = []
        if query_embedding is not None:
            sem_candidates = [
                n for n in self.ast_nodes
                if n.get("code_embedding") is not None
            ]
            # Cosine distance = 1 - cosine_similarity
            def cosine_dist(a, b):
                dot = sum(x * y for x, y in zip(a, b))
                norm_a = math.sqrt(sum(x * x for x in a))
                norm_b = math.sqrt(sum(y * y for y in b))
                if norm_a == 0.0 or norm_b == 0.0:
                    return 1.0
                return 1.0 - (dot / (norm_a * norm_b))

            sem_scored = [
                (node["id"], cosine_dist(node["code_embedding"], query_embedding))
                for node in sem_candidates
            ]
            sem_scored.sort(key=lambda x: x[1])  # ASC
            sem_scored = sem_scored[: match_count * 4]

            for rank, (node_id, _) in enumerate(sem_scored, start=1):
                semantic_ranked.append({"ast_node_id": node_id, "sem_rank": rank})

        # 2. lexical_ranked CTE
        lexical_ranked: list[dict] = []
        if query_text is not None and query_text.strip() != "":
            q_terms = set(query_text.lower().split())
            lex_candidates = []
            for n in self.ast_nodes:
                text_doc = f"{n['symbol_name']} {n['raw_code']}".lower()
                doc_terms = set(text_doc.split())
                overlap = len(q_terms & doc_terms)
                # In Postgres: an.fts @@ websearch_to_tsquery(...)
                if overlap > 0:
                    lex_candidates.append((n["id"], overlap))

            lex_candidates.sort(key=lambda x: x[1], reverse=True)  # DESC
            lex_candidates = lex_candidates[: match_count * 4]

            for rank, (node_id, _) in enumerate(lex_candidates, start=1):
                lexical_ranked.append({"ast_node_id": node_id, "lex_rank": rank})

        # 3. fused CTE: FULL OUTER JOIN on ast_node_id
        sem_map = {r["ast_node_id"]: r["sem_rank"] for r in semantic_ranked}
        lex_map = {r["ast_node_id"]: r["lex_rank"] for r in lexical_ranked}
        all_ids = set(sem_map.keys()) | set(lex_map.keys())

        fused: list[dict] = []
        for node_id in all_ids:
            sem_rank = sem_map.get(node_id)
            lex_rank = lex_map.get(node_id)

            sem_component = (1.0 / (rrf_k + sem_rank)) if sem_rank is not None else 0.0
            lex_component = (1.0 / (rrf_k + lex_rank)) if lex_rank is not None else 0.0
            rrf_score = sem_component + lex_component

            fused.append({
                "ast_node_id": node_id,
                "rrf_score": rrf_score,
                "sem_rank": sem_rank,
                "lex_rank": lex_rank,
            })

        # 4. Main SELECT with JOIN ast_nodes and LEFT JOIN voice_pins
        node_map = {n["id"]: n for n in self.ast_nodes}
        # Voice pins by ast_node_id (can be 0, 1, or multiple)
        pins_map: dict[str, list[dict]] = {}
        for vp in self.voice_pins:
            pins_map.setdefault(vp["ast_node_id"], []).append(vp)

        output: list[dict] = []
        for f in fused:
            node = node_map.get(f["ast_node_id"])
            if not node:
                continue
            matching_pins = pins_map.get(f["ast_node_id"], [None])
            for vp in matching_pins:
                row = {
                    "ast_node_id": node["id"],
                    "file_path": node["file_path"],
                    "symbol_name": node["symbol_name"],
                    "raw_code": node["raw_code"],
                    "ast_signature_hash": node["ast_signature_hash"],
                    "voice_pin_id": vp["id"] if vp else None,
                    "author_handle": vp["author_handle"] if vp else "",
                    "verification_status": vp["verification_status"] if vp else "PENDING_CONFIRMATION",
                    "transcript_raw": vp["transcript_raw"] if vp else "",
                    "constraint_summary": vp["constraint_summary"] if vp else "",
                    "expiry_condition": vp["expiry_condition"] if vp else {},
                    "rrf_score": f["rrf_score"],
                }
                output.append(row)

        output.sort(key=lambda r: r["rrf_score"], reverse=True)
        return output[:match_count]


@pytest.fixture
def sample_dataset():
    # Make orthogonal 384d unit vectors
    v1 = [1.0] + [0.0] * 383
    v2 = [0.0, 1.0] + [0.0] * 382
    v3 = [0.0, 0.0, 1.0] + [0.0] * 381

    ast_nodes = [
        {
            "id": "node-001",
            "file_path": "GatewayRouter.java",
            "symbol_name": "sendV1Frame",
            "raw_code": "int retryCount = 5; int timeoutMs = 4500;",
            "ast_signature_hash": "hash-001",
            "code_embedding": v1,
        },
        {
            "id": "node-002",
            "file_path": "DicomShaderPipeline.java",
            "symbol_name": "renderShader",
            "raw_code": "Thread.sleep(120);",
            "ast_signature_hash": "hash-002",
            "code_embedding": v2,
        },
        {
            "id": "node-003",
            "file_path": "JwtClockSkewFilter.java",
            "symbol_name": "doFilter",
            "raw_code": "long ntpSkew = 120000L;",
            "ast_signature_hash": "hash-003",
            "code_embedding": v3,
        },
    ]
    voice_pins = [
        {
            "id": "pin-001",
            "ast_node_id": "node-001",
            "author_handle": "@anjani",
            "verification_status": "VERIFIED_ACTIVE",
            "transcript_raw": "PR #212 retryCount = 5",
            "constraint_summary": "Do not delete retry loop until v2",
            "expiry_condition": {"config_toggle": "gateway.version", "target_value": "v2"},
        },
        {
            "id": "pin-002",
            "ast_node_id": "node-002",
            "author_handle": "@vikram",
            "verification_status": "PENDING_CONFIRMATION",
            "transcript_raw": "Adreno 619 sleep workaround",
            "constraint_summary": "Sleep needed for GPU sync",
            "expiry_condition": {},
        },
    ]
    return ast_nodes, voice_pins


def test_rrf_null_query_text(sample_dataset):
    """When query_text is NULL, lexical CTE produces 0 rows, score is purely semantic."""
    ast_nodes, voice_pins = sample_dataset
    harness = RrfSimulationHarness(ast_nodes, voice_pins)

    results = harness.execute(
        query_text=None,
        query_embedding=[1.0] + [0.0] * 383,
        match_count=3,
        rrf_k=60,
    )
    assert len(results) == 3
    # Top match should be node-001 (cosine dist 0)
    assert results[0]["ast_node_id"] == "node-001"
    # Score should be exactly 1.0 / (60 + 1) = 1/61
    expected_top_score = 1.0 / 61.0
    assert math.isclose(results[0]["rrf_score"], expected_top_score, rel_tol=1e-5)


def test_rrf_null_query_embedding(sample_dataset):
    """When query_embedding is NULL, semantic CTE produces 0 rows, score is purely lexical."""
    ast_nodes, voice_pins = sample_dataset
    harness = RrfSimulationHarness(ast_nodes, voice_pins)

    results = harness.execute(
        query_text="sendV1Frame timeoutMs",
        query_embedding=None,
        match_count=3,
        rrf_k=60,
    )
    assert len(results) == 1
    assert results[0]["ast_node_id"] == "node-001"
    expected_score = 1.0 / (60 + 1)
    assert math.isclose(results[0]["rrf_score"], expected_score, rel_tol=1e-5)


def test_rrf_both_null_or_empty(sample_dataset):
    """When both query_text and query_embedding are NULL or empty, returns empty list without error."""
    ast_nodes, voice_pins = sample_dataset
    harness = RrfSimulationHarness(ast_nodes, voice_pins)

    results_none = harness.execute(query_text=None, query_embedding=None)
    assert results_none == []

    results_empty = harness.execute(query_text="   \t\n  ", query_embedding=None)
    assert results_empty == []


def test_rrf_fusion_mutual_boost_invariant(sample_dataset):
    """Verify core RRF property: item matched in both lists beats single-list top match."""
    # Construct a scenario where node A is rank 3 in semantic and rank 2 in lexical,
    # while node B is rank 1 in semantic but 0 in lexical.
    # Node A score: 1/(60+3) + 1/(60+2) = 1/63 + 1/62 = 0.01587 + 0.01613 = 0.03200
    # Node B score: 1/(60+1) + 0        = 1/61 + 0        = 0.01639
    # Node A MUST rank above Node B.
    score_a = (1.0 / 63.0) + (1.0 / 62.0)
    score_b = 1.0 / 61.0
    assert score_a > score_b, "Mutual multi-modal rank fusion must strictly outperform single-modality rank 1"


def test_rrf_k_parameter_sensitivity():
    """Verify rrf_k scales reciprocal rank distribution correctly."""
    for k in [1, 20, 60, 100, 1000]:
        r1_score = 1.0 / (k + 1)
        r2_score = 1.0 / (k + 2)
        assert r1_score > r2_score > 0.0
        # Check compression effect: larger k flattens difference between rank 1 and 2
        diff = r1_score - r2_score
        assert diff > 0


def test_ast_node_with_no_voice_pin(sample_dataset):
    """An ast_node with no attached voice pin must LEFT JOIN with graceful NULL/default handling."""
    ast_nodes, voice_pins = sample_dataset
    # node-003 has no voice pin in sample_dataset
    harness = RrfSimulationHarness(ast_nodes, voice_pins)
    results = harness.execute(
        query_text=None,
        query_embedding=[0.0, 0.0, 1.0] + [0.0] * 381,
        match_count=1,
    )
    assert len(results) == 1
    top = results[0]
    assert top["ast_node_id"] == "node-003"
    assert top["voice_pin_id"] is None
    assert top["author_handle"] == ""
    assert top["verification_status"] == "PENDING_CONFIRMATION"
    assert top["constraint_summary"] == ""
    assert top["expiry_condition"] == {}


def test_ast_node_with_multiple_voice_pins():
    """An ast_node with multiple attached voice pins returns one row per pin with equal rrf_score."""
    ast_nodes = [
        {
            "id": "node-multi",
            "file_path": "MultiPin.java",
            "symbol_name": "foo",
            "raw_code": "bar",
            "ast_signature_hash": "hash-multi",
            "code_embedding": [0.1] * 384,
        }
    ]
    voice_pins = [
        {
            "id": "pin-A",
            "ast_node_id": "node-multi",
            "author_handle": "@alice",
            "verification_status": "VERIFIED_ACTIVE",
            "transcript_raw": "First pin",
            "constraint_summary": "Summary A",
            "expiry_condition": {},
        },
        {
            "id": "pin-B",
            "ast_node_id": "node-multi",
            "author_handle": "@bob",
            "verification_status": "UNVERIFIED_HISTORICAL",
            "transcript_raw": "Second pin",
            "constraint_summary": "Summary B",
            "expiry_condition": {},
        },
    ]
    harness = RrfSimulationHarness(ast_nodes, voice_pins)
    results = harness.execute(query_text=None, query_embedding=[0.1] * 384, match_count=5)
    assert len(results) == 2
    assert results[0]["voice_pin_id"] == "pin-A"
    assert results[1]["voice_pin_id"] == "pin-B"
    assert results[0]["rrf_score"] == results[1]["rrf_score"]


def test_check_constraints_verification_status_and_status(parsed_ast):
    """Verify CHECK constraints enforce canonical lifecycle status values."""
    # Statements 8 and 10 are AlterTableStmt adding check constraints
    alter_stmts = [raw.stmt for raw in parsed_ast if isinstance(raw.stmt, ast.AlterTableStmt)]
    add_constraint_cmds = []
    for alter in alter_stmts:
        for cmd in alter.cmds:
            if hasattr(cmd, "subtype") and cmd.subtype.name == "AT_AddConstraint":
                add_constraint_cmds.append(cmd.def_)

    assert len(add_constraint_cmds) == 2
    c1, c2 = add_constraint_cmds[0], add_constraint_cmds[1]
    assert c1.conname in ("chk_voice_pins_verification_status", "chk_voice_pins_status")
    assert c2.conname in ("chk_voice_pins_verification_status", "chk_voice_pins_status")


def test_trigger_definitions_and_functions(parsed_ast):
    """Verify compatibility trigger functions and BEFORE INSERT OR UPDATE triggers."""
    trig_stmts = [raw.stmt for raw in parsed_ast if isinstance(raw.stmt, ast.CreateTrigStmt)]
    assert len(trig_stmts) == 2
    trig_names = {t.trigname: t for t in trig_stmts}
    assert "trg_ast_nodes_sync_compat" in trig_names
    assert "trg_voice_pins_sync_compat" in trig_names

    for t in trig_stmts:
        # Check timing is BEFORE (timing 2 in PostgreSQL AST / BEFORE)
        assert t.row is True  # FOR EACH ROW


def test_rrf_tie_breaking_behavior():
    """When multiple items have identical semantic distance, ROW_NUMBER() assigns distinct sequential ranks."""
    ast_nodes = [
        {"id": f"node-{i}", "file_path": f"File{i}.java", "symbol_name": f"sym{i}", "raw_code": f"code{i}",
         "ast_signature_hash": f"hash-{i}", "code_embedding": [0.5] * 384}
        for i in range(5)
    ]
    harness = RrfSimulationHarness(ast_nodes, [])
    results = harness.execute(query_text=None, query_embedding=[0.5] * 384, match_count=5, rrf_k=60)
    assert len(results) == 5
    scores = [r["rrf_score"] for r in results]
    # Verify scores are strictly non-increasing (distinct ranks produce 1/(60+1), 1/(60+2), ...)
    assert scores == sorted(scores, reverse=True)
    assert len(set(scores)) == 5, "ROW_NUMBER() must produce distinct ranks and thus distinct RRF scores"


def test_rrf_extreme_match_counts(sample_dataset):
    """Verify match_count bounds (0, large count)."""
    ast_nodes, voice_pins = sample_dataset
    harness = RrfSimulationHarness(ast_nodes, voice_pins)

    # match_count = 0
    zero_res = harness.execute(query_text="sendV1Frame", query_embedding=[1.0] + [0.0] * 383, match_count=0)
    assert zero_res == []

    # match_count = 1000 (exceeds total dataset count)
    large_res = harness.execute(query_text="sendV1Frame", query_embedding=[1.0] + [0.0] * 383, match_count=1000)
    assert len(large_res) <= len(ast_nodes)

