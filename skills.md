# Installed Agent Skills Catalog (`skills.md`)

This registry documents all installed external agent skill packs and repository-specific engineering playbooks available to Antigravity and compatible agent runtimes within the Whyline workspace.

---

## 1. Newly Installed Skills Overview

All requested skill packages were installed via `npx skills add` into `.agents/skills/` with native agent auto-detection and execution support.

| Group | Source Repository | Installed Skill(s) | Primary Use Case & Trigger |
| :--- | :--- | :--- | :--- |
| **Anthropic** | `anthropics/skills` | `mcp-builder` | Building FastMCP / TypeScript MCP servers for external API integration. |
| | | `frontend-design` | Distinctive, non-templated frontend visual design, typography & layouts. |
| **Microsoft** | `microsoft/skills` | `podcast-generation` | FastAPI + React WebSocket real-time audio narrative streaming with Azure OpenAI. |
| | | `frontend-design-review` | Design system compliance, 3-pillar UX reviews (Frictionless, Craft, Trustworthy). |
| **Supabase** | `supabase/agent-skills` | `supabase` | Supabase Postgres, pgvector embeddings, Storage, Auth, RLS, migrations, and CLI. |
| **Google** | `google/skills` | `gemini-api`, `gemini-live-api`, `gemini-agents-api`, `gcloud`, etc. | Multimodal Gemini API, Live audio/video streaming, Agent Platform, and GCP infrastructure. |
| **Addy Osmani** | `addyosmani/agent-skills` | `context-engineering` | Agent context curation, rules hierarchy, token budget management, and prompt engineering. |
| | | `test-driven-development` | Red-Green-Refactor loop, bug reproduction (Prove-It Pattern), and test verification. |
| **Swarm Intelligence** | `666ghj/MiroFish` | `mirofish` | Swarm simulation, multi-agent predictive modeling, GraphRAG knowledge graphs, and blast-radius forecasting. |

---

## 2. Skill Profiles & Trigger Details

### 2.1 Anthropic
- **`mcp-builder`** (`.agents/skills/mcp-builder/SKILL.md`)
  - *Trigger:* Use when building new Model Context Protocol (MCP) servers or tools in Python (`fastmcp`) or TypeScript (`@modelcontextprotocol/sdk`).
  - *Focus:* High-leverage workflow tools, structured schema definitions, clear error returns, and token-efficient tool outputs.
- **`frontend-design`** (`.agents/skills/frontend-design/SKILL.md`)
  - *Trigger:* Use when crafting new user interfaces or reshaping existing layouts that need a distinctive, non-generic brand aesthetic.
  - *Focus:* Subject-grounded design, opinionated type pairing, custom palettes, avoiding AI boilerplate components.

### 2.2 Microsoft
- **`podcast-generation`** (`.agents/skills/podcast-generation/SKILL.md`)
  - *Trigger:* Use when implementing text-to-speech features, audio generation, or podcast-style narratives.
  - *Focus:* Python FastAPI WebSocket backend streaming PCM chunks, conversion to WAV, and React audio player integration.
- **`frontend-design-review`** (`.agents/skills/frontend-design-review/SKILL.md`)
  - *Trigger:* Use during PR reviews, accessibility audits, or design system compliance checks on frontend code.
  - *Focus:* 3 quality pillars (Frictionless insight-to-action, Quality Craft, Trustworthy Building) and WCAG accessibility standards.

### 2.3 Supabase
- **`supabase`** (`.agents/skills/supabase/SKILL.md`)
  - *Trigger:* Use for any task touching Supabase Database, Auth, pgvector, Storage, Edge Functions, or CLI migrations.
  - *Focus:* Declarative schemas, RLS policy enforcement, vector embeddings (`ast_nodes`, `voice_pins`), and troubleshooting via Supabase logs.

### 2.4 Google
- **`gemini-api` & `gemini-live-api`** (`.agents/skills/gemini-api/SKILL.md`, `gemini-live-api`)
  - *Trigger:* Use when building Gemini model integrations, function calling, multimodal pipelines, or real-time bi-directional audio/video streaming.
  - *Focus:* Google Gen AI SDK usage across Python and TypeScript, structured schema generation, and agentic workflows.
- **Google Cloud Suite** (`.agents/skills/gcloud/`, `google-cloud-storage-*`, `bigquery-*`, `cloud-run-*`)
  - *Trigger:* Use when provisioning or configuring GCP services, object storage buckets, or cloud deployment pipelines.

### 2.5 Addy Osmani
- **`context-engineering`** (`.agents/skills/context-engineering/SKILL.md`)
  - *Trigger:* Use when starting a new session, when agent reasoning degrades, or when organizing project memory and rule boundaries.
  - *Focus:* Structuring context hierarchies (system prompt $\rightarrow$ project rules $\rightarrow$ skill docs $\rightarrow$ session state) to prevent hallucination.
- **`test-driven-development`** (`.agents/skills/test-driven-development/SKILL.md`)
  - *Trigger:* Use for implementing business logic, fixing bugs, or adding behavioral features.
  - *Focus:* Prove-It pattern (reproduce bug with a failing test first), Red-Green-Refactor, unit test assertions.

### 2.6 MiroFish (Swarm Intelligence & Prediction Engine)
- **`mirofish`** (`.agents/skills/mirofish/SKILL.md`)
  - *Trigger:* Use when modeling multi-agent emergent behavior, developer team adoption friction, blast-radius regression forecasting, or counterfactual code and architectural simulation.
  - *Focus:* Zep Cloud GraphRAG, OASIS agent persona generation, parallel simulation rounds, dynamic variable injection, and ReACT ReportAgent synthesis.

---

## 3. Whyline Agricultural-Technology Project Skills

The workspace also maintains domain-specific internal execution playbooks defined in `whyline_agritech_reusable_developer_agent_skills.md`:

1. **`apply-field-report-ui`**: Enforces the cream-and-olive palette (`#FDFBD4` / `#545333`), regular Crimson Text serif headings, DM Mono tabular data, and pill status badges across React components.
2. **`recover-and-compile-spoken-fence`**: Git blame archaeology combined with voice confirmation (Gnani Prisma/Timbre) and automated JUnit/Pytest test generation.
3. **`curate-and-optimize-field-asset`**: Image and SVG optimization pipeline enforcing olive/cream duotone for brand art, 100% natural color for field evidence, and $\le 15$KB vector budgets.

---

## 4. Verification & Management Commands

To list or inspect installed skills:
```bash
# List all workspace installed skills
npx skills list

# Add or update specific skills
npx skills add anthropics/skills --skill mcp-builder -y
npx skills add microsoft/skills --skill podcast-generation -y
npx skills add supabase/agent-skills --skill supabase -y
npx skills add google/skills -y
npx skills add addyosmani/agent-skills --skill context-engineering -y
npx skills add addyosmani/agent-skills --skill test-driven-development -y
```
