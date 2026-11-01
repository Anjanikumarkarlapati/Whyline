import React from 'react';

export function AstArchaeologyIllustration() {
  return (
    <svg
      viewBox="0 0 320 176"
      width="320"
      height="176"
      role="img"
      aria-label="Tree-sitter AST node scanning GatewayRouter.java and linking to Git Blame PR 212"
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '12px' }}
    >
      <rect x="4" y="4" width="312" height="168" rx="12" fill="var(--bg-raised)" stroke="var(--border)" strokeWidth="1.5" />
      {/* Code file block on left */}
      <rect x="20" y="24" width="124" height="128" rx="10" fill="var(--bg-surface)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <text x="32" y="46" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500">
        GatewayRouter.java
      </text>
      <line x1="32" y1="56" x2="132" y2="56" stroke="var(--border)" strokeWidth="1" />
      <rect x="30" y="66" width="104" height="22" rx="4" fill="var(--accent-wash)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x="36" y="81" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500">
        retryCount = 5;
      </text>
      <line x1="32" y1="102" x2="116" y2="102" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="116" x2="96" y2="116" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" />
      <text x="32" y="138" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="9">
        AST: 97959517
      </text>

      {/* Connector arrow */}
      <line x1="144" y1="88" x2="176" y2="88" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="160" cy="88" r="4" fill="var(--accent)" />

      {/* Git Blame + Incident Provenance on right */}
      <rect x="176" y="28" width="124" height="54" rx="10" fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x="188" y="48" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500">
        PR #212 • Blame
      </text>
      <text x="188" y="66" fill="var(--text-secondary)" fontFamily="var(--font-sans)" fontSize="10">
        00:00 IST SYN drop
      </text>

      <rect x="176" y="94" width="124" height="54" rx="10" fill="var(--accent-wash)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <text x="188" y="114" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500">
        INC-9921 Linked
      </text>
      <text x="188" y="132" fill="var(--text-secondary)" fontFamily="var(--font-sans)" fontSize="10">
        Author: @anjani
      </text>
    </svg>
  );
}

export function SpokenFenceIllustration() {
  return (
    <svg
      viewBox="0 0 320 176"
      width="320"
      height="176"
      role="img"
      aria-label="Soundwave entering a protective Spoken Fence gate anchored to an AST tree node and JUnit test"
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '12px' }}
    >
      <rect x="4" y="4" width="312" height="168" rx="12" fill="var(--bg-raised)" stroke="var(--border)" strokeWidth="1.5" />
      {/* Voice Waveform Card on left */}
      <rect x="18" y="34" width="82" height="108" rx="10" fill="var(--bg-surface)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <text x="28" y="54" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="500">
        10s Voice
      </text>
      <path
        d="M32 92 L32 98 M42 78 L42 112 M52 66 L52 124 M62 82 L62 108 M72 72 L72 118 M82 86 L82 104"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <text x="28" y="132" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="8">
        Prisma v2.5
      </text>

      {/* Protective Gate [ ||| ] in center */}
      <rect x="114" y="28" width="92" height="120" rx="12" fill="var(--accent-wash)" stroke="var(--accent)" strokeWidth="2" />
      <text x="128" y="48" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500">
        FENCE-001
      </text>
      <line x1="138" y1="60" x2="138" y2="122" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="160" y1="60" x2="160" y2="122" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="182" y1="60" x2="182" y2="122" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <text x="128" y="138" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="8">
        LOCKED ACTIVE
      </text>

      {/* Compiled CI Test & Expiry on right */}
      <rect x="220" y="34" width="84" height="50" rx="8" fill="var(--bg-surface)" stroke="var(--text-primary)" strokeWidth="1.5" />
      <text x="230" y="55" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="500">
        JUnit 5 +
      </text>
      <text x="230" y="70" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="9">
        Pytest CI
      </text>

      <rect x="220" y="92" width="84" height="50" rx="8" fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x="230" y="113" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="500">
        Expiry Rule
      </text>
      <text x="230" y="128" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="9">
        gateway: v2
      </text>
    </svg>
  );
}

export function PipelineHookSchematic() {
  return (
    <svg
      viewBox="0 0 320 176"
      width="320"
      height="176"
      role="img"
      aria-label="Technical schematic showing AI Agent Diff intercepted by whyline-mcp and auto-expiring on v2 config"
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '12px' }}
    >
      <rect x="4" y="4" width="312" height="168" rx="12" fill="var(--bg-raised)" stroke="var(--border)" strokeWidth="1.5" />
      {/* AI Agent Edit */}
      <rect x="18" y="44" width="82" height="88" rx="10" fill="var(--bg-surface)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <text x="28" y="66" fill="var(--text-primary)" fontFamily="var(--font-sans)" fontSize="10" fontWeight="600">
        AI Agent Diff
      </text>
      <text x="28" y="86" fill="var(--status-critical)" fontFamily="var(--font-mono)" fontSize="9">
        - retry = 5
      </text>
      <text x="28" y="102" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="9">
        + retry = 1
      </text>

      <line x1="100" y1="88" x2="118" y2="88" stroke="var(--accent)" strokeWidth="2" />

      {/* MCP Guardrail */}
      <rect x="118" y="36" width="86" height="104" rx="10" fill="var(--accent-wash)" stroke="var(--accent)" strokeWidth="2" />
      <text x="128" y="58" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="500">
        whyline-mcp
      </text>
      <path d="M148 86 L158 96 L176 76" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="126" y="122" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="500">
        REJECT_EDIT
      </text>

      <line x1="204" y1="88" x2="222" y2="88" stroke="var(--accent)" strokeWidth="2" />

      {/* Timbre Audio Warning & Safe Cutover */}
      <rect x="222" y="44" width="82" height="88" rx="10" fill="var(--bg-surface)" stroke="var(--text-primary)" strokeWidth="1.5" />
      <text x="232" y="66" fill="var(--text-primary)" fontFamily="var(--font-sans)" fontSize="10" fontWeight="600">
        Voice Alert
      </text>
      <text x="232" y="84" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="9">
        Timbre WAV
      </text>
      <text x="232" y="102" fill="var(--accent)" fontFamily="var(--font-mono)" fontSize="9">
        10/10 Safe
      </text>
    </svg>
  );
}

export function HybridRagDiagramIllustration() {
  return (
    <svg
      viewBox="0 0 560 120"
      width="560"
      height="120"
      role="img"
      aria-label="Voice-to-Voice Hybrid RAG Pipeline combining pgvector 384d embeddings, Reciprocal Rank Fusion, and 3 Ranked Strategies"
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '12px' }}
    >
      <rect x="4" y="4" width="552" height="112" rx="12" fill="var(--bg-raised)" stroke="var(--border)" strokeWidth="1.5" />

      {/* Node 1: Voice/Text Input */}
      <rect x="16" y="22" width="112" height="76" rx="10" fill="var(--bg-surface)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <text x="28" y="46" fill="var(--text-primary)" fontFamily="var(--font-sans)" fontSize="11" fontWeight="600">
        1. Voice / Text
      </text>
      <text x="28" y="64" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="9">
        EN • TE • HI
      </text>
      <text x="28" y="80" fill="var(--accent)" fontFamily="var(--font-mono)" fontSize="9">
        Prisma v2.5 STT
      </text>

      <line x1="128" y1="60" x2="152" y2="60" stroke="var(--accent)" strokeWidth="2" />

      {/* Node 2: Supabase RRF */}
      <rect x="152" y="22" width="132" height="76" rx="10" fill="var(--accent-wash)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x="164" y="46" fill="var(--text-primary)" fontFamily="var(--font-sans)" fontSize="11" fontWeight="600">
        2. Hybrid RRF
      </text>
      <text x="164" y="64" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="9">
        pgvector(384) + FTS
      </text>
      <text x="164" y="80" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="9">
        Single RPC &lt; 50ms
      </text>

      <line x1="284" y1="60" x2="308" y2="60" stroke="var(--accent)" strokeWidth="2" />

      {/* Node 3: Code & Gap Analysis */}
      <rect x="308" y="22" width="112" height="76" rx="10" fill="var(--bg-surface)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <text x="320" y="46" fill="var(--text-primary)" fontFamily="var(--font-sans)" fontSize="11" fontWeight="600">
        3. Code + Why
      </text>
      <text x="320" y="64" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="9">
        AST + Git Blame
      </text>
      <text x="320" y="80" fill="var(--accent)" fontFamily="var(--font-mono)" fontSize="9">
        Best Patch
      </text>

      <line x1="420" y1="60" x2="444" y2="60" stroke="var(--accent)" strokeWidth="2" />

      {/* Node 4: Voice + 3 Strategies */}
      <rect x="444" y="22" width="100" height="76" rx="10" fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x="454" y="46" fill="var(--text-primary)" fontFamily="var(--font-sans)" fontSize="11" fontWeight="600">
        4. Output
      </text>
      <text x="454" y="64" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="9">
        Timbre WAV +
      </text>
      <text x="454" y="80" fill="var(--text-primary)" fontFamily="var(--font-mono)" fontSize="9">
        3 Strategies
      </text>
    </svg>
  );
}

export function AssistantEmptyStateIllustration() {
  return (
    <svg
      viewBox="0 0 320 200"
      width="160"
      height="100"
      role="img"
      aria-label="Minimalist field notebook and studio microphone resting on an archival grid line"
      style={{ width: '160px', height: '100px', display: 'block' }}
    >
      <rect x="20" y="24" width="280" height="152" rx="16" fill="var(--bg-raised)" stroke="var(--border)" strokeWidth="2" />
      <line x1="44" y1="148" x2="276" y2="148" stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" />
      {/* Field Notebook */}
      <rect x="68" y="56" width="88" height="76" rx="8" fill="var(--bg-surface)" stroke="var(--text-primary)" strokeWidth="2" />
      <line x1="84" y1="78" x2="140" y2="78" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <line x1="84" y1="96" x2="132" y2="96" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      {/* Studio Microphone */}
      <rect x="196" y="52" width="32" height="52" rx="16" fill="var(--accent-wash)" stroke="var(--text-primary)" strokeWidth="2" />
      <path d="M188 84 C188 108, 236 108, 236 84" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <line x1="212" y1="108" x2="212" y2="132" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
      <line x1="194" y1="132" x2="230" y2="132" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AuthNotebookStudioPanel({ caption }) {
  return (
    <div className="slab-wrapper">
      <div className="slab-backing" aria-hidden="true" />
      <figure className="slab-frame" style={{ margin: 0, padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            gap: '8px',
          }}
        >
          <span className="status-badge status-good">Illustrative image</span>
          <span className="mono-metric">Gnani Vachana • 16kHz PCM</span>
        </div>
        <svg
          viewBox="0 0 600 460"
          width="600"
          height="460"
          role="img"
          aria-label="Architectural field notebook beside a studio microphone and Spoken Fence schematic"
          style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '16px' }}
        >
          <rect width="600" height="460" rx="16" fill="var(--bg-surface)" stroke="var(--border)" strokeWidth="2" />
          {/* Archival ledger rulings */}
          <line x1="40" y1="90" x2="560" y2="90" stroke="var(--border)" strokeWidth="1" />
          <line x1="40" y1="150" x2="560" y2="150" stroke="var(--border)" strokeWidth="1" />
          <line x1="40" y1="210" x2="560" y2="210" stroke="var(--border)" strokeWidth="1" />
          <line x1="40" y1="270" x2="560" y2="270" stroke="var(--border)" strokeWidth="1" />
          <line x1="40" y1="330" x2="560" y2="330" stroke="var(--border)" strokeWidth="1" />

          {/* Left Field Notebook Page */}
          <rect x="56" y="56" width="260" height="340" rx="14" fill="var(--bg-raised)" stroke="var(--text-primary)" strokeWidth="2" />
          <line x1="84" y1="104" x2="260" y2="104" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <line x1="84" y1="136" x2="284" y2="136" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" />
          <line x1="84" y1="168" x2="240" y2="168" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" />
          <rect x="84" y="204" width="204" height="84" rx="10" fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth="2" />
          <path d="M104 246 L124 226 L144 262 L164 234 L184 254 L204 222 L224 246 L264 246" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="84" y1="324" x2="220" y2="324" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />

          {/* Right Condenser Studio Microphone & AST Anchor */}
          <rect x="364" y="84" width="180" height="312" rx="14" fill="var(--accent-wash)" stroke="var(--border-strong)" strokeWidth="2" />
          <rect x="426" y="128" width="56" height="96" rx="28" fill="var(--bg-surface)" stroke="var(--text-primary)" strokeWidth="2" />
          <line x1="438" y1="156" x2="470" y2="156" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <line x1="438" y1="176" x2="470" y2="176" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <line x1="438" y1="196" x2="470" y2="196" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <path d="M410 184 C410 236, 498 236, 498 184" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
          <line x1="454" y1="236" x2="454" y2="296" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
          <line x1="414" y1="296" x2="494" y2="296" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
          <rect x="392" y="324" width="124" height="40" rx="20" fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth="2" />
        </svg>
        <figcaption className="form-helper" style={{ marginTop: '12px' }}>
          {caption}
        </figcaption>
      </figure>
    </div>
  );
}
