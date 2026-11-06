# WhyLine: Simple GitHub Repo Guide (Ask Repo, Answers, and Flowcharts)

We will simplify WhyLine into a clean three-page tool (**Ask Repo**, **Answers**, and **Flowcharts**) that uses basic, everyday English so any developer—including beginners—can load a GitHub repository, ask questions by voice or text, read clear answers with code links, and see a visual flowchart of how the project works. All emojis and confusing technical terms will be removed.

### User Review & Critical Decisions

> [!IMPORTANT]
> Here are the main updates we will make based on your feedback:

- **Confirmed Decision 1 — Only Three Simple Pages (`Ask Repo`, `Answers`, `Flowcharts`)**: We will remove all extra pages (Home Dashboard, Incidents, Fences, Settings, and Login) and keep only three clear pages in the top bar: **Ask Repo**, **Answers**, and **Flowcharts**.
- **Confirmed Decision 2 — Basic English Everywhere**: We will replace hard-to-read terms (`AST Hash`, `RRF Telemetry`, `BM25`, `Provenance`, `Invariants`, `Spoken Fence`) with simple words every developer knows (`How This Code Works`, `Important Rule`, `Suggested Code Fix`, `Files Used`, `Line Number`).
- **Confirmed Decision 3 — Step-by-Step Flowcharts**: The **Flowcharts** page will show how a request moves through the repository from start to finish, which files work together, and what each file does in plain English.
- **Confirmed Decision 4 — Zero Emojis**: We will remove all emojis from every page, button, label, and message in the project.

---

### 1. Overview & Core Concept

- **What It Does**: You paste a GitHub repository link (or click a sample repo), ask any question by typing or speaking, listen to the voice answer, see the exact file and line of code, and view a step-by-step flowchart of the repository.
- **Who It Is For**: Beginner developers, students, and working programmers who want to understand how a GitHub project works without getting lost in complex files or hard words.
- **Main Benefit**: Makes any codebase easy to understand in a few minutes using simple English, clear code examples, and voice explanations in English, Hindi, or Telugu.

---

### 2. User Experience & Visual Design

- **How Each Page Works**:
  1. **Page 1 — Ask Repo (`/` and `/ask`)**:
     - **Step 1 (Pick a GitHub Repo)**: Paste a GitHub URL or click one of the starter repos (`HealthConnect/payment-gateway-v1`, `expressjs/express`, `sindresorhus/ky`, `facebook/react`). A short 1-sentence note explains what the repo is about.
     - **Step 2 (Ask Your Question)**: Type your question, click the microphone button to speak, or click a **Sample Question** button (for example: *"Where does the app start?"*, *"Why does GatewayRouter retry 5 times?"*, *"How does this repo handle errors?"*). Choose your voice language (**English**, **Hindi**, or **Telugu**).
     - **Step 3 (Listen and Read the Answer)**: Listen to the voice reply with the audio player, read the short answer in basic English, and click **"Open Full Answer & Code"** to see the code side by side.
  2. **Page 2 — Answers (`/answers`)**:
     - Shows your current answer and past questions in two simple columns:
       - **Left Side (Clear Explanation & Fix)**:
         - **Short Answer**: Plain-English explanation of the answer.
         - **Why the Code Is Written This Way**: Simple note explaining what breaks if you change this code carelessly.
         - **Suggested Code Fix**: A clean code block showing the safe way to write or fix the code.
         - **Recent Questions**: Click any question you asked earlier to load it right away from the saved cache without waiting.
       - **Right Side (Code Viewer)**:
         - Shows the actual file from the repository with line numbers. Clicking **"Go to Line"** on any file in the answer jumps straight to that line in the code viewer.
  3. **Page 3 — Flowcharts (`/flowcharts`)**:
     - Explains the whole GitHub repository visually in three easy parts:
       - **About This Project**: Two short sentences explaining *"What This Repo Does"* and *"Real-World Example"*, with a **"Listen to Summary"** button.
       - **Step-by-Step Flowchart**: Shows the 5 main steps of how the repo runs (**Step 1: Request Comes In**, **Step 2: Check and Route Request**, **Step 3: Main Logic and Rules**, **Step 4: Save or Send Data**, **Step 5: Send Response Back**). Users can view this as **Step Cards** or a **Visual Diagram**.
       - **Step Details**: Clicking any step plays the voice explanation for that step, lists which files connect to it, and shows the main code snippet.

- **Visual Style & Clean Layout**:
  - **Simple Top Bar (3 Parts)**:
    1. **Left**: `WhyLine` title.
    2. **Center**: Three page links (`Ask Repo`, `Answers`, `Flowcharts`).
    3. **Right**: Active GitHub Repo button and `Light / Dark` mode button.
  - **Easy-to-Read Colors (60-30-10 Rule)**:
    - *60% Background*: Soft warm paper in Light mode (`#F7F5EE`) and clean dark slate in Dark mode (`#141613`).
    - *30% Cards & Borders*: Clean white or dark gray cards with thin `1px` borders so sections are easy to scan.
    - *10% Highlight Color*: Olive accent (`#545333` in Light mode / `#A3B17A` in Dark mode) for main buttons and active steps.
  - **Readable Fonts**:
    - Clear headings (`Bricolage Grotesque`), comfortable body text (`Plus Jakarta Sans` at `15px–16px`), and clean monospace font (`DM Mono`) for file names, line numbers, and code.
  - **Zero Emojis & Zero Jargon**:
    - No emojis anywhere in the app.
    - Every button and title uses basic, friendly words (`Load Repo`, `Ask Question`, `Play Voice Answer`, `Go to Line`, `Clear Saved Answers`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Reduce the App to 3 Focused Pages (`Ask Repo`, `Answers`, `Flowcharts`)**
  - *What We Are Doing*: Removing all extra pages that developers do not need (Dashboard charts, Incident logs, Fence tables, Settings, and Login screens).
  - *Why*: Beginners can immediately see where to ask a question, where to read the code answer, and where to see the repo flowchart.

- **Decision 2: Keep Your Repo and Answers Shared Across All 3 Pages**
  - *What We Are Doing*: Storing the loaded GitHub repo, the current question, and the saved voice answers in one shared state (plus browser cache).
  - *Why*: When you ask a question on **Ask Repo**, you can click **Answers** or **Flowcharts** and see the exact same repo and answer right away without re-typing anything.

- **Decision 3: Rewrite All Labels and Explanations in Basic English**
  - *What We Are Doing*: Replacing internal system words with simple labels and step-by-step hints (`Step 1`, `Step 2`, `Step 3`).
  - *Why*: Every developer—whether they are reading their first GitHub repo or reviewing a team project—can understand every word on the screen.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **How the App Is Organized**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Top Navigation Bar                              │
│   [WhyLine]        [Ask Repo  |  Answers  |  Flowcharts]     [Repo • Theme]  │
└───────────────┬─────────────────────────────┬────────────────────────┬───────┘
                │                             │                        │
                ▼                             ▼                        ▼
┌───────────────────────────┐   ┌──────────────────────────┐   ┌───────────────────────────┐
│     Page 1: Ask Repo      │   │     Page 2: Answers      │   │    Page 3: Flowcharts     │
│  • Step 1: Paste GitHub   │   │  • Simple English Answer │   │  • What This Repo Does    │
│    URL or Pick Sample     │   │  • Why This Code Matters │   │  • 5-Step Flow Cards &    │
│  • Step 2: Ask by Voice   │   │  • Suggested Code Fix    │   │    Visual Flow Diagram    │
│    or Text + Sample       │   │  • Past Questions List   │   │  • File Connections &     │
│    Questions              │   │  • Side-by-Side Code     │   │    Step Code Preview      │
│  • Step 3: Voice Player   │   │    Viewer with Line Jump │   │  • Step Voice Player      │
│    + Quick Summary        │   │                          │   │                           │
└───────────────┬───────────┘   └─────────────┬────────────┘   └───────────────┬───────────┘
                │                             │                                │
                └─────────────────────────────┼────────────────────────────────┘
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 Shared Repo State & Saved Voice Answer Cache                 │
│   • Current GitHub Repo Info & Files                                         │
│   • Current Answer, Audio Link, and Recent Questions List                    │
│   • Fast Memory + localStorage Cache (English / Hindi / Telugu)              │
└───────────────┬─────────────────────────────┬────────────────────────┬───────┘
                │                             │                        │
                ▼                             ▼                        ▼
┌───────────────────────────┐   ┌──────────────────────────┐   ┌───────────────────────────┐
│  POST /api/github/load    │   │  POST /api/copilot/ask   │   │POST /api/repo/scan-flow   │
│  Loads files from GitHub  │   │  Gemini Brain + Voice    │   │Builds 5-step repo flow    │
└───────────────────────────┘   └──────────────────────────┘   └───────────────────────────┘
```

- **Main Data Stored in the App**:
  - **Current Repo**: Repo name, GitHub link, short description, list of code files, and 3 beginner sample questions.
  - **Current & Saved Answers**: Question text, voice language (`en-IN`, `hi-IN`, `te-IN`), spoken answer text, audio link, list of files and line numbers used in the answer, simple reason why the code is written that way, and a suggested code snippet.
  - **Repo Flowchart**: Simple project overview, 5 connected steps showing how a request moves through the files, and a visual node diagram.

- **How User Actions Work**:
  - **Loading a Repo**: Entering a GitHub URL or clicking a sample repo loads the repo files and updates all three pages (**Ask Repo**, **Answers**, and **Flowcharts**).
  - **Asking a Question**: Clicking **Ask Question (Voice Answer)** checks the saved cache first (playing immediately in `0ms` if already asked) or asks the server-side Gemini Brain, plays the voice explanation, and saves the answer so it is ready on the **Answers** page.
  - **Inspecting Code on Answers Page**: Clicking **"Go to Line"** on any file in the answer opens that file in the code viewer and highlights the exact line.
  - **Exploring the Flowchart**: Clicking any step card or diagram box on the **Flowcharts** page highlights that step, plays its voice explanation, and shows the file path and code snippet for that step.
