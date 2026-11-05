"""
MiroFish Swarm Simulation: 50+ Developers Voice & Frustration Analysis
Extracts developer pain points, categorizes friction, and maps Whyline solutions.
"""

import json
from pathlib import Path

developers = [
    # 1. Systems & Backend Engineers (12)
    {
        "id": "DEV-01", "name": "Arjun Mehta", "role": "Senior Backend Engineer", "industry": "Fintech / Payments",
        "exp": "8 yrs", "stack": "Java / Spring Boot",
        "frustration": "AI agents and junior hires constantly refactor my 5x retry loops because they look like bad code, causing midnight payment dropouts.",
        "quote": "Every couple of months, an enthusiastic dev or an AI coding bot sees 'retryCount = 5' with a magic timeout and replaces it with 'clean code'. Then midnight hits, Razorpay drops 25% of SYN packets, and our on-call phone explodes.",
        "whyline_solution": "Spoken Fences with pre-commit hook hard-blocking retryCount modifications until config upgrade."
    },
    {
        "id": "DEV-02", "name": "Vikramaditya Rao", "role": "Staff Systems Architect", "industry": "Banking Core",
        "exp": "14 yrs", "stack": "C++ / Java",
        "frustration": "When architects leave the firm, their institutional knowledge evaporates. Three years later, nobody knows why an undocumented buffer exists.",
        "quote": "We have 15-year-old core banking code where people are literally scared to touch certain modules. The person who wrote it retired in 2021. Git blame says 'optimize buffer'. That is all.",
        "whyline_solution": "Voice ADRs with author attribution and git blame archaeology restoring the original context."
    },
    {
        "id": "DEV-03", "name": "Sneha Chawla", "role": "Backend Developer", "industry": "E-commerce API",
        "exp": "3 yrs", "stack": "Go / PostgreSQL",
        "frustration": "I spend half my sprint reading PR diffs from 2 years ago trying to guess if a swallowed error was intentional or lazy programming.",
        "quote": "Is this empty catch block an intentional workaround for a buggy third-party webhook, or did someone forget to log it? You end up doing digital archaeology instead of building features.",
        "whyline_solution": "Tree-sitter AST anomaly detector flagging swallowed catches and demanding a 10s voice confirmation."
    },
    {
        "id": "DEV-04", "name": "Tanmay Joshi", "role": "Lead Backend Engineer", "industry": "Logistics Platform",
        "exp": "9 yrs", "stack": "Python / Django",
        "frustration": "Writing architectural docs in Confluence after a 14-hour incident debug session is agony. Nobody does it.",
        "quote": "At 3:30 AM when you finally stabilize the cluster, you just want to sleep. Nobody sits down to write a 3-page markdown document explaining why they tweaked the connection pool.",
        "whyline_solution": "Incident-First voice capture via webhook prompt: 15-second voice note in native tongue compiled into ADR."
    },
    {
        "id": "DEV-05", "name": "Nandini Swaminathan", "role": "Junior Backend Dev", "industry": "SaaS Billing",
        "exp": "1 yr", "stack": "Node.js / Express",
        "frustration": "I'm terrified of touching our billing webhooks. A senior dev warned me not to touch line 42, but never explained why.",
        "quote": "You feel like you are walking through a minefield. You make a small clean-up PR, and someone in code review says 'don't touch that line or Stripe webhooks will double charge'. But there was zero comment in the code!",
        "whyline_solution": "Ask the Repo voice co-pilot providing 3 ranked safe refactoring strategies and line-level voice playback."
    },
    {
        "id": "DEV-06", "name": "Rohan Deshmukh", "role": "Distributed Systems Engineer", "industry": "Cloud Storage",
        "exp": "6 yrs", "stack": "Rust / Tokio",
        "frustration": "Hardcoded timeout values are scattered everywhere. Linters flag them, but making them configurable breaks downstream contracts.",
        "quote": "Static analysis linters are too blunt. They scream about hardcoded literals, but in distributed consensus, some timings are strictly tied to cloud provider network latencies.",
        "whyline_solution": "Config-linked auto-expiring fences that monitor application.yml version upgrades."
    },
    {
        "id": "DEV-07", "name": "Kavita Pillai", "role": "Microservices Engineer", "industry": "Telecom Billing",
        "exp": "5 yrs", "stack": "Java / Micronaut",
        "frustration": "PR reviewers reject my PRs because they don't understand why a particular sleep delay was needed for legacy telco switches.",
        "quote": "Explaining legacy hardware idiosyncrasies in pull request comments takes longer than writing the fix. Reviewers who only know modern microservices think Thread.sleep is an unforgivable sin.",
        "whyline_solution": "Voice walkthrough attached to diff hunks explaining the hardware switch timing constraint."
    },
    {
        "id": "DEV-08", "name": "Gaurav Kulkarni", "role": "Principal Architect", "industry": "Travel Booking",
        "exp": "16 yrs", "stack": "C# / .NET Core",
        "frustration": "New developers rewrite complex multi-threaded sync code into naive async/await, causing thread-pool starvation under load.",
        "quote": "Code looking 'modern' doesn't mean it's right. People see old synchronization locks and replace them with Task.Run, then our flight search API crashes during Diwali ticket sales.",
        "whyline_solution": "Compiled CI invariant tests (xUnit/JUnit) that fail automatically when concurrency contracts are altered."
    },
    {
        "id": "DEV-09", "name": "Ankit Saxena", "role": "API Platform Engineer", "industry": "HealthTech APIs",
        "exp": "4 yrs", "stack": "Python / FastAPI",
        "frustration": "Cursor and Claude Code keep optimizing away my rate-limit backoffs, leading to third-party vendor IP bans.",
        "quote": "AI coding assistants are brilliant, but they suffer from textbook-code syndrome. If an API has an undocumented 429 bug that needs a 1.2s delay, the AI deletes it every time.",
        "whyline_solution": "FastMCP server check_fences tool that informs the AI agent of constraints before it edits the file."
    },
    {
        "id": "DEV-10", "name": "Deepak Verma", "role": "Senior Database Engineer", "industry": "Retail Analytics",
        "exp": "11 yrs", "stack": "PostgreSQL / Go",
        "frustration": "Schema migration workarounds get cleaned up by DBAs who don't realize the mobile clients have a 6-month release lag.",
        "quote": "We keep redundant columns because 15% of our rural users are on app versions from last year. Someone does a schema tidy-up and bricks older app versions.",
        "whyline_solution": "Cross-boundary expiry condition watching database schema versions before allowing cleanup."
    },
    {
        "id": "DEV-11", "name": "Shreya Nair", "role": "Junior Systems Engineer", "industry": "Insurance Core",
        "exp": "2 yrs", "stack": "Java / Hibernate",
        "frustration": "Git blame shows a commit message 'quick fix'. That is literally all the documentation that exists for a 50-line workaround.",
        "quote": "Commit messages are useless. 'Fix bug', 'Update logic', 'WIP'. You look at a 4-year-old method with no comments, and git blame tells you nothing about the actual business reason.",
        "whyline_solution": "Archaeology pipeline that correlates PR comments, linked Jira tickets, and developer voice notes."
    },
    {
        "id": "DEV-12", "name": "Manoj Kumar", "role": "Backend Team Lead", "industry": "EdTech Streaming",
        "exp": "7 yrs", "stack": "Go / WebRTC",
        "frustration": "We have dead-end debugging branches where 3 engineers wasted 4 days testing hypotheses that failed, but nobody wrote it down.",
        "quote": "A new developer spent 3 days trying to optimize our WebRTC jitter buffer using an approach we proved failed two months ago. The knowledge was trapped in someone's head.",
        "whyline_solution": "Dead-End Memory (whyline pause) recording ruled-out hypotheses and playing them back on branch checkout."
    },

    # 2. SRE, DevOps & Infrastructure Leads (8)
    {
        "id": "DEV-13", "name": "Pooja Sharma", "role": "Senior Staff SRE", "industry": "Cloud Infrastructure",
        "exp": "10 yrs", "stack": "Kubernetes / Go / Prometheus",
        "frustration": "Bot notification fatigue. Linters and bot comments spam every PR, so developers ignore all automated feedback.",
        "quote": "If a bot leaves 25 comments on formatting and lint rules for every commit, developers develop bot blindness. When a truly dangerous commit slips through, nobody notices.",
        "whyline_solution": "Anomaly-triggered spoken fences that fire only on ~10% anomalous AST edits with 0 CRUD false positives."
    },
    {
        "id": "DEV-14", "name": "David Chen", "role": "Principal SRE", "industry": "Financial Exchange",
        "exp": "15 yrs", "stack": "Linux Kernel / C / eBPF",
        "frustration": "Post-mortems don't prevent repeat mistakes because nobody reads 40-page incident documents during code reviews.",
        "quote": "We write beautiful post-mortems in Google Docs that live in a drive folder nobody ever visits again. The fix belongs in the code, tied to the exact AST node that failed.",
        "whyline_solution": "Incident-First Voice Capture anchoring post-mortem voice ADRs directly to the culprit code line."
    },
    {
        "id": "DEV-15", "name": "Harish Balakrishnan", "role": "DevOps Engineer", "industry": "Enterprise SaaS",
        "exp": "5 yrs", "stack": "Terraform / AWS / Python",
        "frustration": "Config drift between infrastructure timeouts and hardcoded application timeouts causes cascading outages.",
        "quote": "ALB timeout is 60s, but application has a 120s timeout. When traffic spikes, connection queues back up until the whole pod crashes. We need code and config to be aware of each other.",
        "whyline_solution": "Cross-boundary auto-expiring fences that evaluate both application.yml / Terraform and source ASTs."
    },
    {
        "id": "DEV-16", "name": "Sarah Jenkins", "role": "Site Reliability Engineer", "industry": "Healthcare Cloud",
        "exp": "6 yrs", "stack": "Kubernetes / Python / Grafana",
        "frustration": "On-call engineers make emergency hotfixes at 3 AM that never get cleaned up or properly explained.",
        "quote": "You patch a memory leak by restarting workers every 2 hours as a temporary workaround. That temporary workaround stays in production for 2 years because no one dares remove it.",
        "whyline_solution": "Machine-checkable expiry conditions that flag temporary hotfixes when the root memory leak fix merges."
    },
    {
        "id": "DEV-17", "name": "Pradeep Reddy", "role": "Platform Engineer", "industry": "Fintech / UPI",
        "exp": "8 yrs", "stack": "Kafka / Java / Docker",
        "frustration": "Kafka consumer group rebalancing hacks get deleted during refactoring, causing message processing lag spikes.",
        "quote": "We have an explicit 500ms delay in consumer partition assignment because of network jitter between data centers. Clean-code PRs keep trying to remove it.",
        "whyline_solution": "Pre-edit MCP barrier warning developers and AI agents before touching the Kafka consumer loop."
    },
    {
        "id": "DEV-18", "name": "Elena Rostova", "role": "Cloud Infrastructure Lead", "industry": "Gaming Backend",
        "exp": "12 yrs", "stack": "Go / AWS / Terraform",
        "frustration": "Developers bypass pre-commit hooks using --no-verify because the hooks are slow and full of trivial checks.",
        "quote": "When pre-commit hooks take 45 seconds to run ESLint and Prettier, engineers run git commit --no-verify. Guardrails must be deterministic, instant, and high-signal.",
        "whyline_solution": "Sub-100ms Tree-sitter AST anomaly checks that execute in single-digit milliseconds without blocking velocity."
    },
    {
        "id": "DEV-19", "name": "Bikram Sen", "role": "DevSecOps Lead", "industry": "Government Cloud",
        "exp": "9 yrs", "stack": "Bash / Python / OPA",
        "frustration": "Security exception waivers exist in email threads instead of living in the codebase.",
        "quote": "A developer adds '@SuppressWarnings' or disables TLS validation for an internal staging test, and it ships to prod. When audited, nobody knows who approved the waiver.",
        "whyline_solution": "Validation bypass anomaly detector that enforces recorded voice rationale and expiration rules."
    },
    {
        "id": "DEV-20", "name": "Chloe Martin", "role": "SRE Incident Commander", "industry": "Logistics Dispatch",
        "exp": "7 yrs", "stack": "Datadog / Go / PagerDuty",
        "frustration": "Incident handovers between time zones (Bangalore to London) lose 50% of the debugging context.",
        "quote": "The Asia shift logs off, writes three bullet points in Slack, and London spends 2 hours repeating the same failed triage steps.",
        "whyline_solution": "Resume Context (whyline pause / resume) playing a 10-second audio briefing of active hypotheses upon branch checkout."
    },

    # 3. Frontend, Full-Stack & UI Engineers (10)
    {
        "id": "DEV-21", "name": "Aditi Roy", "role": "Senior Frontend Engineer", "industry": "Design Systems",
        "exp": "7 yrs", "stack": "React / TypeScript / CSS",
        "frustration": "AI agents replace bespoke, accessible CSS tokens with generic Tailwind classes, ruining design system coherence.",
        "quote": "Design systems require discipline. AI tools love throwing random arbitrary hex codes or neon badges everywhere, destroying our carefully tuned high-contrast color hierarchy.",
        "whyline_solution": "Strict token auditing and field-report design principles enforcing semantic palette tokens and zero hex literals."
    },
    {
        "id": "DEV-22", "name": "Rahul Varma", "role": "Full-Stack Developer", "industry": "Agritech Web Portal",
        "exp": "4 yrs", "stack": "React / Node.js",
        "frustration": "Modern SaaS dashboards look terrible under outdoor sunlight on field tablets. Too much glare, tiny tap targets.",
        "quote": "Field officers use our app in direct 40°C sunlight. Those fancy purple gradients and low-contrast grey-on-dark cards are completely illegible in the field.",
        "whyline_solution": "Cream-and-Olive Field Report design system (#FDFBD4 / #545333) with zero shadows and 48px touch targets."
    },
    {
        "id": "DEV-23", "name": "Zainab Fatima", "role": "Frontend Architect", "industry": "Banking Web App",
        "exp": "11 yrs", "stack": "Vue 3 / TypeScript",
        "frustration": "Silent assumptions in frontend state machines lead to bizarre edge-case bugs when network is slow.",
        "quote": "A developer assumes 'isLoading' will always flip to false within 5 seconds. On 2G rural networks, it hangs indefinitely and locks the UI.",
        "whyline_solution": "Assumption Ledger surfacing silent agent and developer assumptions alongside pull request diffs."
    },
    {
        "id": "DEV-24", "name": "Siddharth Jain", "role": "Full-Stack Engineer", "industry": "E-Learning",
        "exp": "3 yrs", "stack": "Next.js / Python",
        "frustration": "Onboarding takes a full month because legacy business logic is hidden in 800-line React components.",
        "quote": "Why is there a setTimeout(..., 350) inside useEffect? If you remove it, the video player crashes on Safari. But there wasn't a single line explaining it.",
        "whyline_solution": "Monaco Code Studio gutter decorations linking lines directly to audio explanations."
    },
    {
        "id": "DEV-25", "name": "Maya Krishnan", "role": "UI/UX Engineer", "industry": "Telemedicine",
        "exp": "5 yrs", "stack": "React / WebGL",
        "frustration": "Translating technical constraints into non-English regional languages for clinical staff is completely neglected.",
        "quote": "Doctors in tier-2 Indian hospitals don't want technical jargon. They need clear, voice-based context in their preferred language.",
        "whyline_solution": "Gnani Vachana multi-lingual speech stack supporting code-mixed Telugu, Hindi, and English."
    },
    {
        "id": "DEV-26", "name": "Karthik Venkatesh", "role": "Junior Full-Stack Dev", "industry": "HealthTech",
        "exp": "1.5 yrs", "stack": "React / Java",
        "frustration": "Imposter syndrome and fear of breaking things makes junior devs avoid refactoring high-impact files.",
        "quote": "You open GatewayRouter.java and see warnings everywhere. You want to clean it up, but you're terrified you will break payment settlement and get fired.",
        "whyline_solution": "Ask the Repo interactive drawer with push-to-talk Q&A providing 3 ranked safe execution strategies."
    },
    {
        "id": "DEV-27", "name": "Priyanka Sen", "role": "Staff Frontend Lead", "industry": "Enterprise Analytics",
        "exp": "10 yrs", "stack": "React / Webpack / D3",
        "frustration": "Third-party chart libraries require weird DOM hacks that get constantly broken during dependency updates.",
        "quote": "D3 resize observers require a 16ms animation frame delay on chromium. Every dependency updater tool tries to remove it.",
        "whyline_solution": "Executable Pytest/JUnit/Jest invariant tests preserving DOM timing workarounds."
    },
    {
        "id": "DEV-28", "name": "Tariq Mansoor", "role": "Full-Stack Developer", "industry": "Supply Chain",
        "exp": "4 yrs", "stack": "Svelte / Go",
        "frustration": "PR descriptions are copy-pasted templates that tell you nothing about why the change was made.",
        "quote": "The PR template asks for 'Summary', 'Test Plan', 'Tickets'. People fill in 'Fixed issue' for all three. We need a faster, lower-friction capture mechanism.",
        "whyline_solution": "10-second Voice Walkthrough anchored to diff hunks."
    },
    {
        "id": "DEV-29", "name": "Divya Nambiar", "role": "Frontend Performance Lead", "industry": "Media Streaming",
        "exp": "8 yrs", "stack": "TypeScript / WebAssembly",
        "frustration": "Micro-optimizations that degrade readability get lost when engineers rewrite components.",
        "quote": "We use bitwise shifts for canvas pixel manipulation. People replace them with Math.floor because it reads nicer, causing 15 FPS frame drops.",
        "whyline_solution": "Spoken fence marking performance-critical AST blocks as protected invariants."
    },
    {
        "id": "DEV-30", "name": "Lucas Silva", "role": "Senior Web Developer", "industry": "Fintech International",
        "exp": "6 yrs", "stack": "Angular / Java",
        "frustration": "Time-zone math workarounds for leap seconds and day-light savings get deleted by well-meaning developers.",
        "quote": "Clock arithmetic is full of edge cases. Someone sees '+ 180' seconds in a JWT validator and deletes it, locking out mobile users with clock drifts.",
        "whyline_solution": "JwtClockSkewFilter spoken fence documenting clock skew tolerances."
    },

    # 4. Mobile, Embedded & IoT Engineers (7)
    {
        "id": "DEV-31", "name": "Dr. Neha Kulkarni", "role": "Head of Radiology Informatics", "industry": "Rural Tele-Health",
        "exp": "13 yrs", "stack": "Android NDK / C++ / OpenGL ES",
        "frustration": "Mobile GPU chipset vendor bugs require thread delays that modern clean-code linters immediately flag.",
        "quote": "Adreno 619 mobile chipsets report buffer readiness 95ms too early. Without Thread.sleep(120), the radiology slice is black noise. Clean-code PRs almost killed this fix.",
        "whyline_solution": "DicomShaderPipeline spoken fence preventing regression of mobile GPU timing workarounds."
    },
    {
        "id": "DEV-32", "name": "Ramesh Patel", "role": "Lead Firmware Engineer", "industry": "Agritech IoT",
        "exp": "12 yrs", "stack": "Embedded C / ESP32 / FreeRTOS",
        "frustration": "Backend developers change API contracts without understanding that rural cellular IoT modems have 5-minute wake sleep cycles.",
        "quote": "A backend engineer changed our sync endpoint to require a double handshake. It drained our solar pump battery banks in 48 hours across 200 farms.",
        "whyline_solution": "Cross-boundary spoken fences linking firmware constraints directly to backend API controllers."
    },
    {
        "id": "DEV-33", "name": "Manish Tiwari", "role": "Senior Android Engineer", "industry": "Consumer Mobile",
        "exp": "8 yrs", "stack": "Kotlin / Coroutines",
        "frustration": "OEM-specific battery saver workarounds (Xiaomi, Samsung) look bizarre to new developers who try to clean them up.",
        "quote": "If you don't use a foreground service with a dummy notification on MIUI, your background sync gets killed in 30 seconds. New devs keep trying to make it a standard WorkManager.",
        "whyline_solution": "Voice ADR explaining OEM battery management idiosyncrasies directly on the service definition."
    },
    {
        "id": "DEV-34", "name": "Ananya Hegde", "role": "IoT Gateway Engineer", "industry": "Smart Energy Grid",
        "exp": "5 yrs", "stack": "Python / C / MQTT",
        "frustration": "Revert commits happen without any explanation of what broke in the field.",
        "quote": "Someone reverts a firmware deployment with commit message 'Revert PR #89'. Which sensor failed? What was the telemetry reading? All context is lost.",
        "whyline_solution": "AST anomaly detector catching revert commits and prompting the engineer for a 15s voice debrief."
    },
    {
        "id": "DEV-35", "name": "Suresh Gounder", "role": "Agritech Extension Tech", "industry": "Rural Irrigation Co-op",
        "exp": "6 yrs", "stack": "Flutter / SQLite",
        "frustration": "Field workers speak Telugu and Tamil; existing dev tooling only supports English, creating a massive barrier for edge logging.",
        "quote": "Our ground technicians know exactly why a pump telemetry controller tripped, but they won't type a formal English report. When they can just speak in Telugu, adoption is 100%.",
        "whyline_solution": "Gnani Prisma v2.5 STT with Telugu/English code-mixed transliteration."
    },
    {
        "id": "DEV-36", "name": "Alexandre Dubois", "role": "Embedded Systems Architect", "industry": "Automotive Telematics",
        "exp": "15 yrs", "stack": "C / AUTOSAR / CAN bus",
        "frustration": "CAN bus timing tolerances are tight; modern developers try to wrap everything in heavy abstraction layers.",
        "quote": "Every layer of abstraction in automotive embedded systems introduces jitter. Spoken fences allow us to lock down zero-allocation critical loops.",
        "whyline_solution": "Tree-sitter AST signature hashing that catches any modification to performance-critical functions."
    },
    {
        "id": "DEV-37", "name": "Nitin Gadkari", "role": "Mobile SDK Lead", "industry": "Identity & Biometrics",
        "exp": "9 yrs", "stack": "Swift / Kotlin / C++",
        "frustration": "Fingerprint scanner driver quirks vary across Android API levels; workarounds get accidentally pruned.",
        "quote": "On Android 10, a specific Samsung sensor needs an explicit pause before camera release. If you clean it up, the app crashes for 4 million users.",
        "whyline_solution": "Executable CI test verifying that device-specific delays are preserved."
    },

    # 5. AI Agent Engineers & Tooling Maintainers (7)
    {
        "id": "DEV-38", "name": "Marcus Vance", "role": "AI Agent Framework Maintainer", "industry": "Open Source AI",
        "exp": "8 yrs", "stack": "Python / TypeScript / LangChain",
        "frustration": "Autonomous coding agents have no awareness of historical constraints. They aggressively delete load-bearing hacks.",
        "quote": "AI coding models are trained on clean GitHub tutorials. Real production code is messy because the real world is messy. Agents delete the mess and break production.",
        "whyline_solution": "FastMCP server exposing check_fences and verify_diff_against_fences to AI coding agents."
    },
    {
        "id": "DEV-39", "name": "Dr. Clara Wu", "role": "Principal AI Researcher", "industry": "Code Generation Models",
        "exp": "11 yrs", "stack": "PyTorch / Python",
        "frustration": "Prompt engineering alone cannot stop LLM hallucination when modifying legacy systems.",
        "quote": "You can tell an LLM 'be careful not to break existing logic' in system prompts all day. Without deterministic AST verification, it will still hallucinate clean-ups.",
        "whyline_solution": "Deterministic pre-commit hooks and AST hash verification acting as hard mathematical guardrails."
    },
    {
        "id": "DEV-40", "name": "Rajiv Singhania", "role": "Developer Experience Lead", "industry": "Enterprise Tech",
        "exp": "10 yrs", "stack": "Go / Node.js / CLI",
        "frustration": "Developers hate opening separate browser dashboards to check code policies; tools must live in their CLI/terminal.",
        "quote": "If a tool requires opening a web portal, logging into Okta, and searching for a ticket, developers won't use it. It has to hook into git and terminal workflows.",
        "whyline_solution": "Native CLI commands (whyline pause / resume / check) and pre-commit Git hook integration."
    },
    {
        "id": "DEV-41", "name": "Sophie Martin", "role": "Senior Tooling Engineer", "industry": "Developer Productivity",
        "exp": "6 yrs", "stack": "Rust / Python / WebAssembly",
        "frustration": "Linter rules are too rigid; they don't support contextual human exceptions.",
        "quote": "Standard linters give you two choices: follow the rule or add a generic ignore comment. WhyLine makes the exception a first-class citizen with living provenance.",
        "whyline_solution": "Living Spoken Fence lifecycle: Verified Active -> Expired Safe to Remove with verified reasons."
    },
    {
        "id": "DEV-42", "name": "Varun Sood", "role": "Autonomous Agent Developer", "industry": "Devin/Cline Ecosystem",
        "exp": "4 yrs", "stack": "Python / Anthropic SDK",
        "frustration": "AI agents get stuck in loops modifying files they shouldn't be editing.",
        "quote": "When an agent is tasked with fixing a bug, it often wanders into adjacent files and 'refactors' them as a side effect. Fences prevent agent wanderlust.",
        "whyline_solution": "Pre-edit barrier that returns REJECT_EDIT to the agent before it writes changes to disk."
    },
    {
        "id": "DEV-43", "name": "Emily Watson", "role": "Open Source Core Committer", "industry": "Web Frameworks",
        "exp": "9 yrs", "stack": "TypeScript / C++",
        "frustration": "Drive-by PRs from AI-assisted contributors submit PRs that pass basic tests but violate architectural invariants.",
        "quote": "We get 30 PRs a week from contributors using AI to generate code. They pass unit tests, but break subtle memory or timing invariants we haven't automated yet.",
        "whyline_solution": "Invariant Test Compiler generating executable test suites from spoken rules."
    },
    {
        "id": "DEV-44", "name": "Sanjay Gupta", "role": "AI Infrastructure Lead", "industry": "Cloud AI Serving",
        "exp": "7 yrs", "stack": "C++ / Triton / Python",
        "frustration": "GPU memory allocation workarounds get refactored by software engineers who don't understand tensor core layouts.",
        "quote": "We pad tensors to multiples of 8 for Tensor Core alignment. Someone removes the padding to 'save memory' and cut throughput by 3x.",
        "whyline_solution": "Tree-sitter AST anomaly detection flagging tensor padding alterations."
    },

    # 6. Security, Compliance & Data Engineers (8)
    {
        "id": "DEV-45", "name": "Farhan Akhtar", "role": "Lead Security Engineer", "industry": "Fintech / Banking",
        "exp": "10 yrs", "stack": "Python / Java / Vault",
        "frustration": "Temporary security bypasses (TrustAllCerts, disabled CSRF) in staging get accidentally merged into production.",
        "quote": "A developer puts TrustAllCerts in code to test a sandbox integration. It works, gets committed, passes review, and suddenly staging TLS verification is disabled.",
        "whyline_solution": "Tree-sitter validation bypass scanner flagging TrustAllCerts and requiring explicit expiration rules."
    },
    {
        "id": "DEV-46", "name": "Meera Sundaram", "role": "Compliance & Audit Lead", "industry": "Healthcare Data",
        "exp": "12 yrs", "stack": "SQL / Python / HIPAA Tools",
        "frustration": "HIPAA and SOC2 compliance audits take weeks because developers can't prove why certain data paths bypass standard checks.",
        "quote": "Auditors demand to know who approved a specific legacy HL7 parser bypass. It takes 3 weeks of digging through archived Jira tickets to find the meeting notes.",
        "whyline_solution": "Supabase pgvector audit ledger linking AST hashes, author voice pins, and timestamps in one verifiable query."
    },
    {
        "id": "DEV-47", "name": "Liam O'Connor", "role": "Data Platform Architect", "industry": "AdTech Big Data",
        "exp": "11 yrs", "stack": "Spark / Scala / Iceberg",
        "frustration": "Midnight batch jobs fail because someone lowered a partition retry threshold that had been tuned over 3 years.",
        "quote": "Our ad-impression deduplication pipeline runs at 01:00 UTC. It needs 5 retries because Kafka brokers rebalance. An engineer lowered it to 2, dropping 10 million impressions.",
        "whyline_solution": "Spoken fence locking partition retry constants with clear voice ADR attribution."
    },
    {
        "id": "DEV-48", "name": "Deepa Madhavan", "role": "Senior Data Engineer", "industry": "E-Commerce Recommender",
        "exp": "6 yrs", "stack": "Python / DuckDB / Airflow",
        "frustration": "Airflow DAG schedule hacks get overwritten when team members migrate to new DAG formats.",
        "quote": "We delay a DAG by 15 minutes because supplier catalog files upload late. Someone updates the DAG template, removes the delay, and downstream runs on empty data.",
        "whyline_solution": "Cross-boundary config expiry that verifies supplier catalog pipeline status."
    },
    {
        "id": "DEV-49", "name": "Carlos Gomez", "role": "Application Security Architect", "industry": "Crypto / Web3",
        "exp": "8 yrs", "stack": "Solidity / Rust / Go",
        "frustration": "Smart contract gas optimization workarounds are extremely fragile and get broken by standard linters.",
        "quote": "In smart contracts, non-standard assembly is used to save gas. Linters scream, but standard Solidity would make transactions unaffordable. You need living fences.",
        "whyline_solution": "AST signature hashing protecting custom inline assembly blocks."
    },
    {
        "id": "DEV-50", "name": "Kavitha Ranganathan", "role": "Privacy Engineering Lead", "industry": "Consumer Tech",
        "exp": "9 yrs", "stack": "Java / Python / Cryptography",
        "frustration": "PII anonymization exceptions for legacy third-party analytics are untracked and risk GDPR fines.",
        "quote": "There are places in legacy code where user IDs aren't hashed because an older billing engine breaks. Without strict tracking, that is a multi-million euro regulatory liability.",
        "whyline_solution": "Unverified historical fence tagging that prompts senior engineers to verify or schedule immediate remediation."
    },
    {
        "id": "DEV-51", "name": "Sunil Narang", "role": "Principal Data Architect", "industry": "Enterprise Telemetry",
        "exp": "14 yrs", "stack": "Kafka / Flink / ClickHouse",
        "frustration": "Stream processing buffer workarounds get cleaned up by engineers who assume network latency is zero.",
        "quote": "People think cloud network latency is negligible. When edge cross-region replication slows down, our Flink backpressure workarounds prevent state store OOMs. Don't touch them!",
        "whyline_solution": "CI invariant tests that simulate backpressure and fail if buffer limits are reduced."
    },
    {
        "id": "DEV-52", "name": "Ananya Sen", "role": "VP of Engineering", "industry": "HealthTech Enterprise",
        "exp": "18 yrs", "stack": "Enterprise Systems / Strategic Ops",
        "frustration": "Engineering velocity is killed by fear of refactoring, while unvetted AI coding tools introduce regression chaos.",
        "quote": "We spend 60% of our engineering budget maintaining old code and fixing regressions caused by AI tools that don't understand the 'Why'. Whyline gives us the confidence to move fast without breaking load-bearing systems.",
        "whyline_solution": "Full-stack Whyline platform: 0 CRUD false positives, 10/10 invariant protection, 50% ramp-up reduction."
    }
]

# Write to json file
output_path = Path("scratch_50_devs_simulation.json")
output_path.write_text(json.dumps(developers, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Successfully generated {len(developers)} developer profiles in {output_path}")

# Calculate statistics
categories = {}
frustrations = {
    "Chesterton's Fence & Fear of Breaking Unknown Hacks": 0,
    "AI Coding Agents Cleaning Up Load-Bearing Workarounds": 0,
    "Lost Tribal Knowledge & Missing 'Why' on Staff Departures": 0,
    "Post-Mortem & Architecture Documentation Friction (2 AM Burnout)": 0,
    "Notification & Linter Alert Fatigue (Bot Blindness)": 0,
    "Cross-Boundary Config & Hardware/Driver Mismatches": 0
}

for d in developers:
    f = d["frustration"].lower()
    if "ai agent" in f or "cursor" in f or "refactor" in f or "clean code" in f:
        frustrations["AI Coding Agents Cleaning Up Load-Bearing Workarounds"] += 1
    elif "leave" in f or "depart" in f or "vanish" in f or "institutional" in f or "git blame" in f:
        frustrations["Lost Tribal Knowledge & Missing 'Why' on Staff Departures"] += 1
    elif "doc" in f or "confluence" in f or "post-mortem" in f or "write" in f:
        frustrations["Post-Mortem & Architecture Documentation Friction (2 AM Burnout)"] += 1
    elif "bot" in f or "linter" in f or "fatigue" in f or "spam" in f:
        frustrations["Notification & Linter Alert Fatigue (Bot Blindness)"] += 1
    elif "hardware" in f or "driver" in f or "config" in f or "timeout" in f or "gpu" in f:
        frustrations["Cross-Boundary Config & Hardware/Driver Mismatches"] += 1
    else:
        frustrations["Chesterton's Fence & Fear of Breaking Unknown Hacks"] += 1

print("Frustration Distribution:")
for k, v in frustrations.items():
    print(f" - {k}: {v} ({v/len(developers)*100:.1f}%)")
