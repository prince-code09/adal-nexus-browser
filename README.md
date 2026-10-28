# AdaL Nexus

> **Plans. Executes. Verifies.**
>
> An AI-native autonomous browser desktop application that converts natural-language goals into structured plans, executes real actions through authorized browser tools, verifies actual results through deterministic file read-back, and gates consequential actions behind user approval.

---

## 1. Architectural Overview

AdaL Nexus is built around a local Node.js + Electron architecture without heavy or unnecessary backend frameworks:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AdaL Nexus Desktop App                          │
│                                                                        │
│  ┌────────────────────────┐         ┌───────────────────────────────┐  │
│  │   Electron Preload     │ ◄─────► │  React Companion UI + Rail    │  │
│  │  (Context Isolation)   │         │ (Tailwind + Lucide + Vite)    │  │
│  └───────────┬────────────┘         └───────────────┬───────────────┘  │
│              │ IPC Bridge                           │ WebSocket Event  │
│              ▼                                      ▼ Stream (5174)    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Electron Main Process                       │  │
│  │                                                                  │  │
│  │  ┌───────────────────┐  ┌──────────────────┐  ┌───────────────┐  │  │
│  │  │    Task Planner   │  │ Execution Engine │  │ Tool Registry │  │  │
│  │  │ (Provider Adapter)│  │ (State Machine)  │  │ (Allowlisted) │  │  │
│  │  └────────┬──────────┘  └────────┬─────────┘  └───────┬───────┘  │  │
│  │           │                      │                    │          │  │
│  │  ┌────────▼──────────┐  ┌────────▼─────────┐  ┌───────▼───────┐  │  │
│  │  │  Zod Validation   │  │ Approval Manager │  │ Playwright    │  │  │
│  │  │ (Schemas & Types) │  │  (Safety Gates)  │  │ Chromium + CDP│  │  │
│  │  └───────────────────┘  └────────┬─────────┘  └───────┬───────┘  │  │
│  │                                  │                    │          │  │
│  │  ┌───────────────────┐  ┌────────▼─────────┐  ┌───────▼───────┐  │  │
│  │  │   SQLite Task     │  │  Artifact & CSV  │  │ Verification  │  │  │
│  │  │   History DB      │  │     Service      │  │    Engine     │  │  │
│  │  └───────────────────┘  └──────────────────┘  └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### The 15 Core Modules

1. **Electron Main Process & Secure Preload** (`src/main/main.ts`, `src/main/preload.ts`): Secure context isolation, disabled Node integration in renderer, allowlisted IPC channels.
2. **React Companion Panel** (`src/renderer/components/CompanionPanel.tsx`): Natural-language input, real-time step visualization, live action logs, and approval prompt cards.
3. **Browser Workspace** (`src/renderer/components/BrowserWorkspace.tsx`): Displays real controlled Playwright Chromium session with live screencasts, page status, and one-click manual takeover/resume controls.
4. **Results Workspace** (`src/renderer/components/ResultsWorkspace.tsx`): Audited evidence inspector displaying verified CSV tables, file sizes, and assertion-by-assertion proof cards.
5. **AI Task Planner** (`src/main/agent/planner.ts`): Provider-independent planner with automatic fallback to zero-key deterministic local adapter in Phase 1.
6. **Structured Plan Validation** (`src/main/agent/validation.ts`): Zod schemas for execution plans, steps, approval requests, and startup datasets.
7. **Tool Registry & Router** (`src/main/agent/tools/registry.ts`): Strict parameter validation, security allowlist (only HTTP/HTTPS, path traversal protection), and approval-gated tool dispatch.
8. **Execution Engine** (`src/main/agent/execution-engine.ts`): Sequential step orchestrator, bounded retries (max 2), error recovery, cooperative cancellation, and state persistence.
9. **Playwright Browser Tools** (`src/main/browser/browser-service.ts`): Chromium browser controller supporting navigation, DOM reading, typing, clicking, and viewport screenshots.
10. **Independent Verification Engine** (`src/main/agent/verification/verification-engine.ts`): Enforces `VERIFIED`, `FAILED`, and `UNVERIFIED` statuses through deterministic read-back checks.
11. **Approval & Cancellation Manager** (`src/main/agent/approval/approval-manager.ts`): Intercepts consequential actions (`publish_content`, `send_message`, `delete_data`) and awaits explicit user confirmation.
12. **WebSocket Event Service** (`src/main/services/websocket-service.ts`): Real-time live log and step streaming server on port 5174.
13. **SQLite Task History** (`src/main/db/database.ts`): Persistent task run history using Node 22+ built-in `node:sqlite`.
14. **Artifact Management Service** (`src/main/services/artifact-service.ts`): Safe sandboxed file system manager for CSV artifacts and read-back parsing.
15. **Integrations Module Architecture** (`src/main/integrations/google-workspace.ts`, `src/main/integrations/github.ts`): Ready structure for Phase 2 Google Sheets and GitHub automation.

---

## 2. Windows Setup & Prerequisites

### Prerequisites

- **OS**: Windows 10/11 (x64)
- **Node.js**: v20+ or v24+
- **PowerShell**: 5.1+ or PowerShell 7+

### Step-by-Step Installation

1. Open PowerShell in the project directory:
   ```powershell
   cd "C:\Users\Prince Mishra\Desktop\browser"
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Install Playwright Chromium browser binaries:
   ```powershell
   npx playwright install chromium
   ```

4. Create local configuration file from template:
   ```powershell
   Copy-Item .env.example .env
   ```

---

## 3. Running & Testing

### Run All Unit & Integration Tests

The test suite runs with Vitest and executes deterministic checks across all modules, including real Playwright browser automation:

```powershell
npm test
```

### Launch Development Application

To launch both the Vite React companion and the Electron desktop application:

```powershell
npm run dev
```

Or run Vite and Electron separately:
```powershell
# Terminal 1: Start React Vite dev server
npm run dev:vite

# Terminal 2: Start Electron main process
npm run dev:electron
```

### Build Production Desktop Application

To compile both processes and package the Windows desktop app:

```powershell
# Compile TypeScript main process and bundle renderer
npm run build

# Package unpacked directory
npm run pack

# Build Windows installer (NSIS & Portable)
npm run dist
```

---

## 4. First Complete Demonstration Workflow

### Goal Prompt
> *"Research five AI startups, collect their company names, products, pricing and source URLs, create a CSV file, and verify the saved result."*

### Execution Stages
1. **Plan Generation**: The AI Task Planner generates a 4-step structured plan with deterministic verification checks.
2. **Autonomous Browser Navigation**: Playwright launches Chromium and visits official AI startup landing pages (Anthropic, Perplexity, Mistral, Cohere, Cursor).
3. **Structured Data Extraction**: Reads actual page text and captures verified facts, retaining full source URLs.
4. **Honest Pricing Enforcement**: Real pricing tiers are recorded; unavailable prices are strictly marked `unknown` rather than fabricated.
5. **Physical CSV Generation**: Writes `artifacts/startups.csv` with standard headers (`company_name`, `product`, `pricing`, `source_url`).
6. **Independent Read-Back Verification**: Re-opens `artifacts/startups.csv` from disk, verifies file presence, header conformity, row count (`>= 5`), and citation integrity.
7. **Inspection**: The Results Workspace renders the verified table and assertion cards with `VERIFIED` status.

---

## 5. Security & Safety Controls

- **Zero Arbitrary Execution**: Webpage content is treated as untrusted text, never as executable code or commands.
- **Path Traversal Protection**: Filesystem writes and reads are restricted to the sandboxed `artifacts/` folder.
- **Protocol Allowlist**: Only `http:` and `https:` URLs are permitted in browser tools.
- **Consequential Action Gates**: Destructive operations halt execution until approved in the Companion UI.
- **Electron Security**: `nodeIntegration: false`, `contextIsolation: true`, secure preload IPC bridge.
