-- WhyLine Hybrid Graph-RAG Schema: AST Nodes, Spoken Fences (Voice Pins),
-- Dead-End Memory Checkpoints, and Single-Round-Trip Reciprocal Rank Fusion (RRF) RPC.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- 1. AST Nodes Table (Tree-sitter normalized signature hashes)
create table if not exists public.ast_nodes (
    id uuid primary key default gen_random_uuid(),
    repo_name text not null default 'HealthConnect',
    file_path text not null,
    symbol_name text not null,
    ast_signature_hash text not null unique,
    start_line integer not null,
    end_line integer not null,
    anomaly_type text not null,
    code_snippet text not null,
    fts_doc tsvector generated always as (
        to_tsvector('english', coalesce(file_path, '') || ' ' || coalesce(symbol_name, '') || ' ' || coalesce(code_snippet, ''))
    ) stored,
    embedding vector(384),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_ast_nodes_signature_hash on public.ast_nodes (ast_signature_hash);
create index if not exists idx_ast_nodes_fts on public.ast_nodes using gin (fts_doc);
create index if not exists idx_ast_nodes_embedding_hnsw on public.ast_nodes using hnsw (embedding vector_cosine_ops);

-- 2. Voice Pins / Spoken Fences Table
create table if not exists public.voice_pins (
    id text primary key,
    ast_node_id uuid references public.ast_nodes(id) on delete cascade,
    ast_signature_hash text not null,
    file_path text not null,
    symbol_name text not null,
    anomaly_type text not null,
    status text not null check (status in (
        'VERIFIED_ACTIVE',
        'PENDING_CONFIRMATION',
        'UNVERIFIED_HISTORICAL',
        'EXPIRED_SAFE_TO_REMOVE'
    )),
    confidence text not null default 'HIGH' check (confidence in ('HIGH', 'MEDIUM', 'LOW')),
    author_handle text not null,
    author_active boolean not null default true,
    language text not null default 'te-IN',
    transcript text,
    reconstructed_why text not null,
    constraint_summary text not null,
    danger_condition text not null,
    expiry_condition jsonb not null default '{}'::jsonb,
    invariant_test_path text,
    audio_url text,
    provenance jsonb not null default '{}'::jsonb,
    fts_doc tsvector generated always as (
        to_tsvector(
            'english',
            coalesce(file_path, '') || ' ' ||
            coalesce(symbol_name, '') || ' ' ||
            coalesce(reconstructed_why, '') || ' ' ||
            coalesce(constraint_summary, '') || ' ' ||
            coalesce(transcript, '')
        )
    ) stored,
    embedding vector(384),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_voice_pins_ast_hash on public.voice_pins (ast_signature_hash);
create index if not exists idx_voice_pins_status on public.voice_pins (status);
create index if not exists idx_voice_pins_fts on public.voice_pins using gin (fts_doc);
create index if not exists idx_voice_pins_embedding_hnsw on public.voice_pins using hnsw (embedding vector_cosine_ops);

-- 3. Dead-End Memory & Resume Context Checkpoints
create table if not exists public.debug_checkpoints (
    id text primary key,
    repo_name text not null default 'HealthConnect',
    branch_name text not null,
    author_handle text not null,
    summary text not null,
    ruled_out_dead_ends jsonb not null default '[]'::jsonb,
    next_untested_action text not null,
    audio_url text,
    created_at timestamptz not null default now()
);

-- 4. Single-Round-Trip Reciprocal Rank Fusion (RRF) Hybrid Search RPC
create or replace function public.match_whyline_code_and_fences(
    query_text text,
    query_embedding vector(384),
    match_count integer default 5,
    rrf_k integer default 60
)
returns table (
    fence_id text,
    file_path text,
    symbol_name text,
    ast_signature_hash text,
    anomaly_type text,
    status text,
    confidence text,
    reconstructed_why text,
    constraint_summary text,
    danger_condition text,
    expiry_condition jsonb,
    provenance jsonb,
    audio_url text,
    rrf_score double precision
)
language sql
stable
as $$
with semantic_ranked as (
    select
        vp.id,
        row_number() over (order by (vp.embedding <=> query_embedding) asc) as sem_rank
    from public.voice_pins vp
    where vp.embedding is not null
    limit match_count * 4
),
lexical_ranked as (
    select
        vp.id,
        row_number() over (
            order by ts_rank_cd(vp.fts_doc, websearch_to_tsquery('english', query_text)) desc
        ) as lex_rank
    from public.voice_pins vp
    where vp.fts_doc @@ websearch_to_tsquery('english', query_text)
    limit match_count * 4
),
fused as (
    select
        coalesce(s.id, l.id) as id,
        coalesce(1.0 / (rrf_k + s.sem_rank), 0.0) +
        coalesce(1.0 / (rrf_k + l.lex_rank), 0.0) as rrf_score
    from semantic_ranked s
    full outer join lexical_ranked l on s.id = l.id
)
select
    vp.id as fence_id,
    vp.file_path,
    vp.symbol_name,
    vp.ast_signature_hash,
    vp.anomaly_type,
    vp.status,
    vp.confidence,
    vp.reconstructed_why,
    vp.constraint_summary,
    vp.danger_condition,
    vp.expiry_condition,
    vp.provenance,
    vp.audio_url,
    f.rrf_score
from fused f
join public.voice_pins vp on vp.id = f.id
order by f.rrf_score desc
limit match_count;
$$;
