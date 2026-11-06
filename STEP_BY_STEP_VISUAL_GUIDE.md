# WhyLine Studio — Step-by-Step Beginner Visual Guide & Page Report

Welcome to **WhyLine Studio**! If you are a complete beginner, here is the simplest way to understand what this project does before we walk through every single screen in order:

> **The Big Idea in One Sentence (Chesterton's Fence):**
> Sometimes developers write a strange-looking piece of code (like *"try sending this payment 5 times"* or *"pause for 120 milliseconds"*) to fix a real-world emergency. Later, a new developer or an AI coding assistant looks at that code, thinks *"Why is this weird line here? Let me clean it up!"*, deletes it, and accidentally crashes the hospital or bank system!
>
> **WhyLine Studio** lets engineers record a **10-second voice note** (in **English, Telugu, or Hindi**) explaining **WHY** that code exists, locks that voice note onto the exact code structure (**AST**), and automatically blocks any AI or human edit that tries to break it.

---

## Step 1: Sign-In & Workspace Entry (`/login`)

![Step 1: Sign-In & Workspace Entry](/screenshots/01-login-page.png)

### What Is This Page? (Beginner Explanation)
Think of this page as the **security gate at the front entrance of a hospital or bank**. Before anyone can inspect code or record voice rules, they sign in here so WhyLine knows which engineer is speaking, which language they prefer, and which codebase to protect.

### Simple Everyday Example
> **Example:** Just like tapping your employee ID badge at the office front door so the building knows your name (`@anjani`), your preferred language (**English, Telugu, or Hindi**), and which project room (`HealthConnect` or `Whyline`) to open for you.

### Section-by-Section Breakdown of the Image
1. **Top Navigation Bar (Brand, Language Switcher & Theme Toggle):**
   - **What we used it for:** Lets you switch the entire application between **English (EN)**, **Telugu (తెలుగు)**, and **Hindi (हिंदी)**, or toggle between **Paper Light** and **Khaki Dark** themes before you even log in.
2. **Left Security Overview Panel ("Chesterton's Fence Visual Stamp"):**
   - **What we used it for:** Introduces the core principle of the app—never remove a fence (a code workaround) until you understand why it was built.
3. **Right Sign-In Form (`Engineer Email` & `Repository` Selector):**
   - **What we used it for:** Validates the engineer's email address, connects to the target repository (`HealthConnect`), and opens the main Briefing Dashboard.

---

## Step 2: Codebase Guard & Fence Briefing Dashboard (`/`)

![Step 2: Codebase Guard & Fence Briefing Dashboard](/screenshots/02-briefing-dashboard.png)

### What Is This Page? (Beginner Explanation)
This is your **Main Control Center**—like the main dashboard screen inside a modern car or a hospital nurse station board. At one glance, it tells you:
- How many special code workarounds (**Fences**) exist in your project (`10`),
- How many are already protected by voice notes (`6 / 10`),
- How many still need an engineer's voice note (`4`), and
- How many dangerous AI edits were automatically stopped (`10 / 10`).

### Simple Everyday Example
> **Example:** Imagine a hospital nurse station board showing: **6 patients** have complete doctor charts (*Active Fences*), **4 patients** are waiting for a doctor's 10-second voice note (*Pending Notes*), and **10 wrong medicine orders** were automatically stopped by the pharmacy computer (*Blocked Breaks*).

### Section-by-Section Breakdown of the Image
1. **Top Context Header & "Scan repo" Button:**
   - **What we used it for:** Shows which repository is loaded (`HealthConnect`), the current config version (`gateway.version = v1`), and a button to re-scan the codebase for new anomalies.
2. **Priority Workaround Alert Banner (Highlighted Box at Top):**
   - **What we used it for:** Calls attention to the #1 most urgent code rule (`Payment Settlement Anomaly — PR #212 / INC-9921`, where `retryCount = 5` prevents midnight bank packet drops) with a 1-click **"Confirm FENCE-001"** button.
3. **4 Guardrail Metric Cards (`Active Fences`, `Pending Notes`, `Blocked Breaks`, `Expired Fences`):**
   - **What we used it for:** Gives instant health numbers (`6/10` active, `4` pending, `10/10` breaks blocked, `0` expired).
4. **Interactive Repository Flowchart & Voice Agent (Middle Section):**
   - **What we used it for:** Lets you paste **any GitHub repository URL** (such as `https://github.com/Anjanikumarkarlapati/Whyline`), generates a **5-step interactive architecture flowchart**, and uses the **Gnani Vachana + Gemini Reasoning engine** to explain each step aloud in simple terms with a real-life example in English, Telugu, or Hindi.
5. **Pending Voice Confirmations List (Bottom Left) & 90-Second Demo Flow (Bottom Right):**
   - **What we used it for:**
     - **Left List:** Lists the 4 code workarounds (`FENCE-003`, `FENCE-004`, `FENCE-008`, `FENCE-009`) that still need voice confirmation.
     - **Right 90-Second Demo Card:** Gives beginners 3 simple buttons (**Act 1: Confirm in Telugu**, **Act 2: Test Block**, **Act 3: Cutover v2**) to experience the entire lifecycle in 90 seconds.
6. **Guardrail Intercept Ledger Chart (Bottom Graph):**
   - **What we used it for:** Plots a 5-day visual chart comparing daily voice confirmations (bars) against blocked AI code breaks (line).

---

## Step 3: Spoken Fences Studio (`/fences`)

![Step 3: Spoken Fences Studio](/screenshots/03-spoken-fences.png)

### What Is This Page? (Beginner Explanation)
This is the **Voice Recording & Code-Locking Studio**. When a developer writes a tricky workaround in code, writing long documentation takes too much time—so nobody does it! Here, the developer simply clicks **Record**, speaks for **10 seconds** in **Telugu, Hindi, or English** explaining *why* that code is needed, and WhyLine automatically:
1. Transcribes their voice into text,
2. Links the recording to the exact code lines (**AST Node**), and
3. Compiles an **automatic unit test (JUnit / Pytest)** that guards those lines forever.

### Simple Everyday Example
> **Example:** Imagine attaching a talking voice-tag onto a special water valve in your house that says: *"Do NOT turn this valve off! It keeps the upstairs heater from freezing at midnight."* If anyone tries to turn the valve off, your voice message plays and locks the valve.

### Section-by-Section Breakdown of the Image
1. **Create New Spoken Fence Form (Top Card):**
   - **What we used it for:** Lets you create a brand-new Spoken Fence by picking an AST node, recording or entering a voice note, and defining when the workaround expires.
2. **Spoken Fences Filter Tabs & Table (`All`, `Verified`, `Pending`, `Historical`, `Expired`):**
   - **What we used it for:** Lists all 10 detected AST anomalies (`FENCE-001` through `FENCE-010`), showing the File & Method Symbol, AST Anomaly Type (e.g., `MAGIC_RETRY_COUNT`, `HARDCODED_SLEEP`), Git PR source, and Verification Status.
3. **Spoken Fence Studio & AST Node Linker (Bottom Split Inspector):**
   - **What we used it for:**
     - **Left Side (AST Target & Provenance):** Shows the exact SHA-256 AST signature hash, matched code token (`retryCount = 5; timeoutMs = 4500`), reconstructed Git/PR reason, and danger condition if deleted.
     - **Right Side (10s Voice Recorder, Rescored Tokens & Auto-Compiled JUnit/Pytest):** Lets you record a 10-second voice note or load a sample in **Telugu, Hindi, or English**, shows how spoken words map to exact code variables (`retry count = 5` -> `retryCount = 5`), plays the 16kHz WAV audio, and displays the auto-generated JUnit/Pytest guardrail test.

---

## Step 4: AST Anomaly & Fence Code Studio (`/studio`)

![Step 4: AST Anomaly & Fence Code Studio](/screenshots/04-code-studio.png)

### What Is This Page? (Beginner Explanation)
This is your **Interactive Code Editor & AI Crash-Test Simulator**. Here you can open the actual Java or Python source code files, see the exact highlighted lines protected by a Spoken Fence, and test what happens when an AI coding agent tries to "clean up" or delete that workaround.

### Simple Everyday Example
> **Example:** Think of **Automatic Lane-Keep Assist** in a modern car. If a driver (or autopilot) tries to steer over a solid yellow line without permission, the car sounds an alert and blocks the unsafe steering move.

### Section-by-Section Breakdown of the Image
1. **Guarded File Selector Tabs & Line Badge:**
   - **What we used it for:** Lets you switch between guarded source files (like `GatewayRouter.java`) and shows which lines (`Lines 5–15 Fenced`) are under protection.
2. **Source Code Editor with Fenced Gutter Highlight (Left Panel):**
   - **What we used it for:** Shows the real code (`int retryCount = 5;`, `int timeoutMs = 4500;`) with visual highlighting on the protected lines so developers immediately see where the fence lives.
3. **Fence Gutter Note & Pre-Commit Simulation Controls (Right Panel):**
   - **What we used it for:**
     - Displays the **Recorded Reason (Why)**, **Risk if Removed**, and **Expiry Condition** (`gateway.version == 'v2'`).
     - Includes **"Play 16kHz Voice Note"** to hear the engineer's voice right inside the code editor.
     - Includes **"Simulate Naive Agent Edit"** to test the FastMCP pre-commit interceptor (`REJECT_EDIT`) and **"Flip gateway.version to v2"** to see how upgrading the infrastructure safely retires the old fence.

---

## Step 5: Incidents & Institutional Memory Ledger (`/incidents`)

![Step 5: Incidents & Institutional Memory Ledger](/screenshots/05-incidents-memory.png)

### What Is This Page? (Beginner Explanation)
This page is the **"Medical History Book" of your codebase**. Every weird code workaround was born from a real production outage in the past! This page connects:
1. **Past Production Incidents** (`INC-9921`, `INC-8840`, `INC-7410`),
2. **Saved Branch Investigation Checkpoints**, and
3. **The 10-Case Seeded Benchmark Matrix** proving that WhyLine blocks 100% of dangerous AI edits without blocking normal everyday code changes.

### Simple Everyday Example
> **Example:** Like a hospital's permanent allergy and incident logbook: *"On Night Shift INC-9921, the payment server dropped 14% of packets at midnight. Here is the engineer's voice recording from that night, what hypotheses were ruled out, and the safety rule that now protects every midnight settlement."*

### Section-by-Section Breakdown of the Image
1. **Recent Incident Postmortems (Top Left Card):**
   - **What we used it for:** Summarizes major real-world outages (`INC-9921` Razorpay v1 Midnight Packet Drop, `INC-8840` Mali-G72 GPU Frame Buffer Tear, `INC-7410` Rural PHC Satellite NTP Clock Drift) and links each one to its Fence ID.
2. **Saved Branch Checkpoints with Voice Briefings (Top Right Card):**
   - **What we used it for:** Stores voice-narrated debugging checkpoints (`CHK-01`, `CHK-02`, `CHK-03`) showing what the engineer already ruled out and what the next step is, with a **Play Voice Checkpoint** button.
3. **10-Case Seeded Benchmark & Guardrail Verification Table (Bottom Full-Width Table):**
   - **What we used it for:** Shows all 10 real-world test cases (`FENCE-001` to `FENCE-010`), comparing what a naive AI agent tries to do (*"Change retryCount from 5 to 1"*), the AI's mistaken assumption, the real world truth, and how WhyLine intercepts it (`Blocked` / `Verified Active`).

---

## Step 6: Ask the Repo — Voice Co-Pilot Page (`/copilot`)

![Step 6: Ask the Repo — Voice Co-Pilot Page](/screenshots/06-voice-copilot.png)

### What Is This Page? (Beginner Explanation)
When you ask a question about the codebase on this page, WhyLine does **not** just read raw code or comments back to you. Instead, it uses **Server-Side Gemini Reasoning (`gemini-3.8-flash` with `ThinkingLevel.MEDIUM`)** to think through the problem and explain it to you like a patient teacher:
1. **In Simple Everyday Terms** (no jargon!),
2. **With a Vivid Real-Life Example / Analogy**,
3. **With a 1-2-3 Step-by-Step Reasoning Chain**, and
4. **Spoken aloud in English (`en-IN`), Telugu (`te-IN`), or Hindi (`hi-IN`)!**

### Simple Everyday Example
> **Example:** When you ask about the `GatewayRouter.java` double-charge bug, instead of reading `for (int attempt = 1; attempt <= retryCount; attempt++)`, Gemini explains:
> *"Imagine mailing a payment slip to a busy bank counter at midnight where the clerk accidentally drops every 4th envelope. You send 5 copies so one definitely arrives—but you stamp **'Order #101 - Pay Only Once'** on top of every copy so the bank only charges the customer once!"*

### Section-by-Section Breakdown of the Image
1. **Question Input Box, Voice Mic Button & 5 Preset Topic Pills (Top Card):**
   - **What we used it for:** Lets you type or speak any codebase question, or click one of the 5 preset topics (`Telugu: PR #212`, `Hindi: PR #212`, `Fix Double-Charge`, `DICOM 120ms Sleep`, `Whyline Repo Architecture`).
2. **Spoken & Written Answer Banner:**
   - **What we used it for:** Displays and speaks the friendly, conversational voice answer in your active language (`English`, `Telugu`, or `Hindi`) with a **Play 16kHz WAV** button.
3. **"In Simple Terms (Gemini Reasoning)" & "Real-Life Example / Analogy" Cards (Side-by-Side):**
   - **What we used it for:** Translates complex code workarounds into beginner-friendly plain language alongside a concrete everyday analogy.
4. **Step-by-Step Reasoning Trace (`1 -> 2 -> 3`):**
   - **What we used it for:** Shows the logical steps Gemini used to connect the root hardware/network problem to the existing code fence and the safe fix.
5. **Recommended Code Patch & 3 Ranked Architectural Strategies (Bottom Cards):**
   - **What we used it for:** Gives developers the exact safe code snippet to copy (`X-Idempotency-Key`) plus 3 ranked architectural options (`Strategy 01: Low Risk`, `Strategy 02: Outbox Pattern`, `Strategy 03: Upgrade to v2`).

---

## Step 7: Git Commit Graph & Spoken Architecture Flowchart (`/git`)

![Step 7: Git Commit Graph & Spoken Architecture Flowchart](/screenshots/07-git-flowchart.png)

### What Is This Page? (Beginner Explanation)
Looking at hundreds of files in a Git repository is confusing for beginners. This page turns any repository into a **visual 5-step map** (plus a live commit history scanner) and narrates each step aloud in **English, Telugu, or Hindi** with simple explanations and real-world analogies.

### Simple Everyday Example
> **Example:** Think of an **interactive Metro Train Map** where clicking **Station 1 -> Station 2 -> Station 3 -> Station 4 -> Station 5** lights up that station, explains what happens there in simple words (like comparing the AST Scanner to an *airport X-ray machine* or the MCP Pre-Commit Guard to a *railway crossing barrier*), and speaks the explanation in your language.

### Section-by-Section Breakdown of the Image
1. **Interactive Repository Flowchart & Voice Agent (Top Section):**
   - **What we used it for:** Scans any GitHub URL or preset repo (`Anjanikumarkarlapati/Whyline`, `healthconnect-india/payment-gateway`, `whyline-labs/clinical-dicom-pipeline`), displays the **Gnani Vachana Voice & Audio Output Analyzer**, and renders the 5 interactive architecture steps.
2. **Step Detail Inspector ("In Simple Terms" + "Real-Life Example" + Guarded Code):**
   - **What we used it for:** Shows the active step's conversational voice script, Gemini simple-terms explanation, real-world analogy, Chesterton's Fence "Why", and guarded code snippet.
3. **Git Commit History & Spoken Diff Narration Scanner (Bottom Section):**
   - **What we used it for:** Scans recent Git commits on the selected branch, draws an SVG commit dependency flowchart, and narrates each commit's purpose and risk level in English, Telugu, or Hindi.

---

## Step 8: Studio, Security & Model Settings (`/settings`)

![Step 8: Studio, Security & Model Settings](/screenshots/08-settings-page.png)

### What Is This Page? (Beginner Explanation)
This is the **"Control Room & Safety Inspection Certificate"** of WhyLine Studio. It shows how the frontend, backend, voice engine, and security locks are connected, and proves that all 6 security rules and all 10 benchmark guardrails are verified and active.

### Simple Everyday Example
> **Example:** Just like the framed **Fire & Health Safety Inspection Certificate** on the wall of a hospital or restaurant—showing that every safety lock, alarm, and filter has been tested and passed (`6 / 6 Enforced`, `10 / 10 Protected`).

### Section-by-Section Breakdown of the Image
1. **Three System Configuration Cards (`01 Repository & Environment`, `02 Git Pre-Commit & MCP Guard Status`, `03 Speech, Vector & Compiler Providers`):**
   - **What we used it for:** Shows the active repo path (`demo-repos/HealthConnect`), the `localStorage['whyline-lang']` language synchronization status, `.git/hooks/pre-commit` MCP status, Gnani Vachana STT/TTS, pgvector + MiniLM RRF, and Tree-sitter 4-language scanner status.
2. **Security & Test Suite Audit Remediation Status Table (`6 / 6 Enforced`):**
   - **What we used it for:** Documents and verifies all 6 security protections (`VULN-01` CORS allowlist, `VULN-02/03` Git branch/remote sanitization, `VULN-04` workspace path containment, `VULN-05` audio stem allowlist, `DEFECT-3.2/3.3` MCP diff hunk check, and `DEFECT-3.4` AST signature hash).
3. **HealthConnect Invariant Telemetry Scorecard (`10 / 10 Protected`):**
   - **What we used it for:** Displays the live benchmark scorecard (`10` seeded AST anomalies, `7` hard-blocked edits, `3` historical cautions, `0` routine CRUD false positives, and `2` live intercept events).

---

## Step 9: Quick "Ask Repo" Slide-Over Drawer (Accessible from Any Page)

![Step 9: Quick Ask Repo Slide-Over Drawer](/screenshots/09-ask-repo-drawer.png)

### What Is This Panel? (Beginner Explanation)
What if you are looking at the Briefing Dashboard, Spoken Fences, or Code Studio and want a quick simple explanation of a code rule **without leaving the page you are on**? Clicking the **"Ask Repo"** button in the top-right navigation bar slides open this instant helper drawer!

### Simple Everyday Example
> **Example:** Like pressing the **"Call Attendant"** button above your seat on an airplane—a helpful guide comes right to your seat to explain something in simple terms with an example, without you having to leave your seat.

### Section-by-Section Breakdown of the Image
1. **Top-Right "Ask Repo" Button (In Header Bar):**
   - **What we used it for:** Opens the slide-over Co-Pilot drawer from any screen in a single click.
2. **Compact Voice/Text Question Input & Preset Chips:**
   - **What we used it for:** Lets you ask a question or click quick preset chips (`Telugu: PR #212`, `Hindi: PR #212`, `Fix Double-Charge`) right inside the drawer.
3. **Instant Simple Explanation + Real-Life Analogy + Copyable Code Patch:**
   - **What we used it for:** Shows the full Gemini-reasoned simple explanation, real-world analogy, 16kHz WAV audio player, copyable code fix, and 3 ranked strategies right beside your current work.
