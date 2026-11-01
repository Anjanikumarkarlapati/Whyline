-- =============================================================================
-- WhyLine PostgreSQL 16 Migration: AST Nodes, Voice Pins, Indexes, and RRF RPC
-- File: backend/migrations/01_init.sql
-- =============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. AST Nodes Table (Tree-sitter normalized AST signature nodes & embeddings)
CREATE TABLE IF NOT EXISTS public.ast_nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_name text NOT NULL DEFAULT 'HealthConnect',
    file_path text NOT NULL,
    symbol_name text NOT NULL,
    raw_code text NOT NULL,
    ast_signature_hash text NOT NULL UNIQUE,
    start_line integer NOT NULL DEFAULT 1,
    end_line integer NOT NULL DEFAULT 1,
    anomaly_type text NOT NULL DEFAULT 'AST_ANOMALY',
    fts tsvector GENERATED ALWAYS AS (to_tsvector('english', symbol_name || ' ' || raw_code)) STORED,
    code_embedding vector(384),
    -- Backwards compatibility columns / aliases for existing services
    code_snippet text,
    fts_doc tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(file_path, '') || ' ' || coalesce(symbol_name, '') || ' ' || coalesce(raw_code, ''))
    ) STORED,
    embedding vector(384),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Schema reconciliation for ast_nodes in existing deployments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ast_nodes' AND column_name='raw_code') THEN
        ALTER TABLE public.ast_nodes ADD COLUMN raw_code text;
        UPDATE public.ast_nodes SET raw_code = COALESCE(code_snippet, '') WHERE raw_code IS NULL;
        ALTER TABLE public.ast_nodes ALTER COLUMN raw_code SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ast_nodes' AND column_name='code_snippet') THEN
        ALTER TABLE public.ast_nodes ADD COLUMN code_snippet text;
        UPDATE public.ast_nodes SET code_snippet = raw_code WHERE code_snippet IS NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ast_nodes' AND column_name='code_embedding') THEN
        ALTER TABLE public.ast_nodes ADD COLUMN code_embedding vector(384);
        UPDATE public.ast_nodes SET code_embedding = embedding WHERE code_embedding IS NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ast_nodes' AND column_name='embedding') THEN
        ALTER TABLE public.ast_nodes ADD COLUMN embedding vector(384);
        UPDATE public.ast_nodes SET embedding = code_embedding WHERE embedding IS NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ast_nodes' AND column_name='fts') THEN
        ALTER TABLE public.ast_nodes ADD COLUMN fts tsvector GENERATED ALWAYS AS (to_tsvector('english', symbol_name || ' ' || raw_code)) STORED;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ast_nodes' AND column_name='fts_doc') THEN
        ALTER TABLE public.ast_nodes ADD COLUMN fts_doc tsvector GENERATED ALWAYS AS (
            to_tsvector('english', coalesce(file_path, '') || ' ' || coalesce(symbol_name, '') || ' ' || coalesce(raw_code, ''))
        ) STORED;
    END IF;
END $$;

-- 3. Voice Pins Table (Spoken Fences attached to AST Nodes)
CREATE TABLE IF NOT EXISTS public.voice_pins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ast_node_id uuid REFERENCES public.ast_nodes(id) ON DELETE CASCADE,
    fence_id text,
    ast_signature_hash text NOT NULL DEFAULT '',
    file_path text NOT NULL DEFAULT '',
    symbol_name text NOT NULL DEFAULT '',
    anomaly_type text NOT NULL DEFAULT 'AST_ANOMALY',
    author_handle text NOT NULL,
    author_name text DEFAULT '',
    author_active boolean NOT NULL DEFAULT true,
    language text NOT NULL DEFAULT 'te-IN',
    verification_status text NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    status text NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    confidence text NOT NULL DEFAULT 'HIGH',
    transcript_raw text NOT NULL DEFAULT '',
    transcript text DEFAULT '',
    reconstructed_why text NOT NULL DEFAULT '',
    constraint_summary text NOT NULL,
    danger_condition text NOT NULL DEFAULT '',
    expiry_condition jsonb NOT NULL DEFAULT '{}'::jsonb,
    invariant_test_path text,
    audio_url text,
    provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
    transcript_embedding vector(384),
    embedding vector(384),
    fts_doc tsvector GENERATED ALWAYS AS (
        to_tsvector(
            'english',
            coalesce(file_path, '') || ' ' ||
            coalesce(symbol_name, '') || ' ' ||
            coalesce(reconstructed_why, '') || ' ' ||
            coalesce(constraint_summary, '') || ' ' ||
            coalesce(transcript_raw, '')
        )
    ) STORED,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Schema reconciliation for voice_pins in existing deployments
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='voice_pins' AND column_name='id' AND data_type='text'
    ) THEN
        ALTER TABLE public.voice_pins ADD COLUMN IF NOT EXISTS fence_id text;
        UPDATE public.voice_pins SET fence_id = id WHERE fence_id IS NULL;
        ALTER TABLE public.voice_pins DROP CONSTRAINT IF EXISTS voice_pins_pkey CASCADE;
        ALTER TABLE public.voice_pins ALTER COLUMN id TYPE uuid USING (
            CASE WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                 THEN id::uuid 
                 ELSE gen_random_uuid() 
            END
        );
        ALTER TABLE public.voice_pins ALTER COLUMN id SET DEFAULT gen_random_uuid();
        ALTER TABLE public.voice_pins ADD PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='voice_pins' AND column_name='fence_id') THEN
        ALTER TABLE public.voice_pins ADD COLUMN fence_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='voice_pins' AND column_name='verification_status') THEN
        ALTER TABLE public.voice_pins ADD COLUMN verification_status text NOT NULL DEFAULT 'PENDING_CONFIRMATION';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='voice_pins' AND column_name='transcript_raw') THEN
        ALTER TABLE public.voice_pins ADD COLUMN transcript_raw text NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='voice_pins' AND column_name='transcript_embedding') THEN
        ALTER TABLE public.voice_pins ADD COLUMN transcript_embedding vector(384);
    END IF;
END $$;

-- Check constraints for valid lifecycle status
ALTER TABLE public.voice_pins DROP CONSTRAINT IF EXISTS chk_voice_pins_verification_status;
ALTER TABLE public.voice_pins ADD CONSTRAINT chk_voice_pins_verification_status CHECK (
    verification_status IN ('VERIFIED_ACTIVE', 'PENDING_CONFIRMATION', 'UNVERIFIED_HISTORICAL', 'EXPIRED_SAFE_TO_REMOVE')
);

ALTER TABLE public.voice_pins DROP CONSTRAINT IF EXISTS chk_voice_pins_status;
ALTER TABLE public.voice_pins ADD CONSTRAINT chk_voice_pins_status CHECK (
    status IN ('VERIFIED_ACTIVE', 'PENDING_CONFIRMATION', 'UNVERIFIED_HISTORICAL', 'EXPIRED_SAFE_TO_REMOVE')
);

-- 4. Dead-End Memory & Debug Checkpoints Table
CREATE TABLE IF NOT EXISTS public.debug_checkpoints (
    id text PRIMARY KEY,
    repo_name text NOT NULL DEFAULT 'HealthConnect',
    branch_name text NOT NULL,
    author_handle text NOT NULL,
    summary text NOT NULL,
    ruled_out_dead_ends jsonb NOT NULL DEFAULT '[]'::jsonb,
    next_untested_action text NOT NULL,
    audio_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Backwards Compatibility Triggers
CREATE OR REPLACE FUNCTION public.sync_ast_nodes_compat()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF (NEW.raw_code IS NULL OR NEW.raw_code = '') AND (NEW.code_snippet IS NOT NULL AND NEW.code_snippet <> '') THEN
            NEW.raw_code := NEW.code_snippet;
        ELSIF (NEW.code_snippet IS NULL OR NEW.code_snippet = '') AND (NEW.raw_code IS NOT NULL AND NEW.raw_code <> '') THEN
            NEW.code_snippet := NEW.raw_code;
        END IF;

        IF NEW.code_embedding IS NULL AND NEW.embedding IS NOT NULL THEN
            NEW.code_embedding := NEW.embedding;
        ELSIF NEW.embedding IS NULL AND NEW.code_embedding IS NOT NULL THEN
            NEW.embedding := NEW.code_embedding;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.raw_code IS DISTINCT FROM OLD.raw_code AND NEW.code_snippet IS NOT DISTINCT FROM OLD.code_snippet THEN
            NEW.code_snippet := NEW.raw_code;
        ELSIF NEW.code_snippet IS DISTINCT FROM OLD.code_snippet AND NEW.raw_code IS NOT DISTINCT FROM OLD.raw_code THEN
            NEW.raw_code := NEW.code_snippet;
        END IF;

        IF NEW.code_embedding IS DISTINCT FROM OLD.code_embedding AND NEW.embedding IS NOT DISTINCT FROM OLD.embedding THEN
            NEW.embedding := NEW.code_embedding;
        ELSIF NEW.embedding IS DISTINCT FROM OLD.embedding AND NEW.code_embedding IS NOT DISTINCT FROM OLD.code_embedding THEN
            NEW.code_embedding := NEW.embedding;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_ast_nodes_sync_compat
BEFORE INSERT OR UPDATE ON public.ast_nodes
FOR EACH ROW EXECUTE FUNCTION public.sync_ast_nodes_compat();

CREATE OR REPLACE FUNCTION public.sync_voice_pins_compat()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.verification_status <> 'PENDING_CONFIRMATION' AND NEW.status = 'PENDING_CONFIRMATION' THEN
            NEW.status := NEW.verification_status;
        ELSIF NEW.status <> 'PENDING_CONFIRMATION' AND NEW.verification_status = 'PENDING_CONFIRMATION' THEN
            NEW.verification_status := NEW.status;
        ELSIF (NEW.verification_status IS NULL OR NEW.verification_status = '') AND (NEW.status IS NOT NULL AND NEW.status <> '') THEN
            NEW.verification_status := NEW.status;
        ELSIF (NEW.status IS NULL OR NEW.status = '') AND (NEW.verification_status IS NOT NULL AND NEW.verification_status <> '') THEN
            NEW.status := NEW.verification_status;
        END IF;

        IF (NEW.transcript_raw IS NULL OR NEW.transcript_raw = '') AND (NEW.transcript IS NOT NULL AND NEW.transcript <> '') THEN
            NEW.transcript_raw := NEW.transcript;
        ELSIF (NEW.transcript IS NULL OR NEW.transcript = '') AND (NEW.transcript_raw IS NOT NULL AND NEW.transcript_raw <> '') THEN
            NEW.transcript := NEW.transcript_raw;
        END IF;

        IF NEW.transcript_embedding IS NULL AND NEW.embedding IS NOT NULL THEN
            NEW.transcript_embedding := NEW.embedding;
        ELSIF NEW.embedding IS NULL AND NEW.transcript_embedding IS NOT NULL THEN
            NEW.embedding := NEW.transcript_embedding;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.verification_status IS DISTINCT FROM OLD.verification_status AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
            NEW.status := NEW.verification_status;
        ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.verification_status IS NOT DISTINCT FROM OLD.verification_status THEN
            NEW.verification_status := NEW.status;
        END IF;

        IF NEW.transcript_raw IS DISTINCT FROM OLD.transcript_raw AND NEW.transcript IS NOT DISTINCT FROM OLD.transcript THEN
            NEW.transcript := NEW.transcript_raw;
        ELSIF NEW.transcript IS DISTINCT FROM OLD.transcript AND NEW.transcript_raw IS NOT DISTINCT FROM OLD.transcript_raw THEN
            NEW.transcript_raw := NEW.transcript;
        END IF;

        IF NEW.transcript_embedding IS DISTINCT FROM OLD.transcript_embedding AND NEW.embedding IS NOT DISTINCT FROM OLD.embedding THEN
            NEW.embedding := NEW.transcript_embedding;
        ELSIF NEW.embedding IS DISTINCT FROM OLD.embedding AND NEW.transcript_embedding IS NOT DISTINCT FROM OLD.transcript_embedding THEN
            NEW.transcript_embedding := NEW.embedding;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_voice_pins_sync_compat
BEFORE INSERT OR UPDATE ON public.voice_pins
FOR EACH ROW EXECUTE FUNCTION public.sync_voice_pins_compat();

-- 6. Indexes (HNSW for Vector Cosine Ops, GIN for FTS, B-Trees for foreign keys & hashes)
CREATE INDEX IF NOT EXISTS idx_ast_nodes_embedding_hnsw ON public.ast_nodes USING hnsw (code_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_ast_nodes_fts ON public.ast_nodes USING gin (fts);
CREATE INDEX IF NOT EXISTS idx_ast_nodes_signature_hash ON public.ast_nodes (ast_signature_hash);
CREATE INDEX IF NOT EXISTS idx_ast_nodes_compat_embedding ON public.ast_nodes USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_ast_nodes_fts_doc ON public.ast_nodes USING gin (fts_doc);

CREATE INDEX IF NOT EXISTS idx_voice_pins_ast_node_id ON public.voice_pins (ast_node_id);
CREATE INDEX IF NOT EXISTS idx_voice_pins_transcript_embedding ON public.voice_pins USING hnsw (transcript_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_voice_pins_verification_status ON public.voice_pins (verification_status);
CREATE INDEX IF NOT EXISTS idx_voice_pins_ast_hash ON public.voice_pins (ast_signature_hash);
CREATE INDEX IF NOT EXISTS idx_voice_pins_compat_embedding ON public.voice_pins USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_voice_pins_status ON public.voice_pins (status);
CREATE INDEX IF NOT EXISTS idx_voice_pins_fts ON public.voice_pins USING gin (fts_doc);

-- 7. Drop existing function signatures to permit return type upgrade
DROP FUNCTION IF EXISTS public.match_whyline_code_and_fences(text, vector, integer, integer);

-- 8. Single-Round-Trip Reciprocal Rank Fusion (RRF) RPC Function
CREATE OR REPLACE FUNCTION public.match_whyline_code_and_fences(
    query_text text,
    query_embedding vector(384),
    match_count integer DEFAULT 5,
    rrf_k integer DEFAULT 60
)
RETURNS TABLE (
    ast_node_id uuid,
    file_path text,
    symbol_name text,
    raw_code text,
    ast_signature_hash text,
    voice_pin_id uuid,
    author_handle text,
    verification_status text,
    transcript_raw text,
    constraint_summary text,
    expiry_condition jsonb,
    rrf_score double precision,
    -- Backwards compatibility aliases
    code_snippet text,
    status text,
    transcript text,
    fence_id text,
    reconstructed_why text,
    danger_condition text,
    audio_url text,
    provenance jsonb
)
LANGUAGE sql
STABLE
AS $$
WITH semantic_ranked AS (
    SELECT
        an.id AS ast_node_id,
        ROW_NUMBER() OVER (
            ORDER BY (an.code_embedding <=> query_embedding) ASC
        ) AS sem_rank
    FROM public.ast_nodes an
    WHERE query_embedding IS NOT NULL
      AND an.code_embedding IS NOT NULL
    ORDER BY (an.code_embedding <=> query_embedding) ASC
    LIMIT match_count * 4
),
lexical_ranked AS (
    SELECT
        an.id AS ast_node_id,
        ROW_NUMBER() OVER (
            ORDER BY ts_rank_cd(an.fts, websearch_to_tsquery('english', query_text)) DESC
        ) AS lex_rank
    FROM public.ast_nodes an
    WHERE query_text IS NOT NULL
      AND trim(query_text) <> ''
      AND an.fts @@ websearch_to_tsquery('english', query_text)
    ORDER BY ts_rank_cd(an.fts, websearch_to_tsquery('english', query_text)) DESC
    LIMIT match_count * 4
),
fused AS (
    SELECT
        COALESCE(s.ast_node_id, l.ast_node_id) AS ast_node_id,
        COALESCE(1.0 / (rrf_k + s.sem_rank), 0.0) +
        COALESCE(1.0 / (rrf_k + l.lex_rank), 0.0) AS rrf_score
    FROM semantic_ranked s
    FULL OUTER JOIN lexical_ranked l ON s.ast_node_id = l.ast_node_id
)
SELECT
    an.id AS ast_node_id,
    an.file_path,
    an.symbol_name,
    an.raw_code,
    an.ast_signature_hash,
    vp.id AS voice_pin_id,
    COALESCE(vp.author_handle, '') AS author_handle,
    COALESCE(vp.verification_status, 'PENDING_CONFIRMATION') AS verification_status,
    COALESCE(vp.transcript_raw, '') AS transcript_raw,
    COALESCE(vp.constraint_summary, '') AS constraint_summary,
    COALESCE(vp.expiry_condition, '{}'::jsonb) AS expiry_condition,
    f.rrf_score,
    -- Backwards compatibility aliases
    an.raw_code AS code_snippet,
    COALESCE(vp.status, vp.verification_status, 'PENDING_CONFIRMATION') AS status,
    COALESCE(vp.transcript, vp.transcript_raw, '') AS transcript,
    vp.fence_id,
    COALESCE(vp.reconstructed_why, '') AS reconstructed_why,
    COALESCE(vp.danger_condition, '') AS danger_condition,
    vp.audio_url,
    COALESCE(vp.provenance, '{}'::jsonb) AS provenance
FROM fused f
JOIN public.ast_nodes an ON an.id = f.ast_node_id
LEFT JOIN public.voice_pins vp ON vp.ast_node_id = an.id
ORDER BY f.rrf_score DESC
LIMIT match_count;
$$;
