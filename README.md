# AdaL Nexus – An Autonomous Browser

> **Plans. Executes. Verifies.**

AdaL Nexus is an AI-powered autonomous desktop browser designed to make web browsing and repetitive online tasks easier through natural language instructions.

## About the Project

AdaL Nexus was originally developed as a hackathon project for an event organized by HackBriven at Microsoft Office.

## Download AdaL Nexus

Get the latest Windows version of AdaL Nexus.

- **[Download Setup (.exe)](https://github.com/prince-code09/adal-nexus-browser/releases/download/v1.0.0/AdaL.Nexus.-.Setup.exe)**
- **[Download Portable (.exe)](https://github.com/prince-code09/adal-nexus-browser/releases/download/v1.0.0/AdaL.Nexus.-.Portable.exe)**
- [View All Releases](https://github.com/prince-code09/adal-nexus-browser/releases)

## Overview

AdaL Nexus combines a desktop browsing experience with an AI-powered task execution system. Users can interact with the browser normally or provide natural language instructions to the AI agent.

The application is designed around three main ideas:

- **Plan:** Understand user instructions and prepare an execution plan.
- **Execute:** Perform supported browser tasks using automation tools.
- **Verify:** Check execution results and present the outcome to the user.

## Key Features

### 1. Desktop Browser
- Electron-based desktop application.
- Chromium-powered web browsing.
- Multi-tab browsing interface.
- URL navigation and search.
- Back, Forward, Refresh and Home controls.
- Bookmarks and browsing history.

### 2. AI Agent
- Natural language task instructions.
- AI-assisted task planning.
- Structured task execution.
- Task progress and result reporting.
- Execution verification.

### 3. Browser Automation
- Browser navigation.
- Clicking and interacting with web elements.
- Filling supported forms.
- Extracting webpage information.
- Research and data collection workflows.

### 4. Results and Downloads
- Task execution results.
- Structured data extraction.
- CSV artifact generation.
- Local artifact storage.

### 5. User Experience
- Futuristic violet-themed interface.
- Cosmic New Tab background.
- Dark and Light themes.
- Browser workspace and AI companion interface.
- Persistent application settings.

## Architecture

AdaL Nexus uses an Electron desktop architecture with a React-based frontend and a Node.js backend process.

```text
                 USER
                   |
                   v
          React Companion Panel
                   |
                   v
            Electron IPC
                   |
                   v
          Electron Main Process
                   |
          +--------+--------+
          |                 |
          v                 v
      AI Planner        Tab Manager
          |                 |
          v                 v
    Plan Validation    Browser Views
          |
          v
    Approval Manager
          |
          v
    Execution Engine
          |
          v
      Tool Registry
          |
          v
   Browser Automation
          |
          v
   Result Verification
          |
          v
    Results & Artifacts
```

## Technology Stack

| Technology | Purpose |
|---|---|
| Electron | Desktop application |
| Chromium | Web rendering engine |
| React | Frontend interface |
| Vite | Frontend development and build |
| TypeScript | Application development |
| Tailwind CSS | UI styling |
| Lucide React | Icons |
| Node.js | Main process runtime |
| Playwright | Browser automation |
| Gemini API | AI-powered instruction processing |
| SQLite | Local task data storage |
| Zod | Data validation |

## Project Structure

```text
adal-nexus-browser/
│
├── src/
│   ├── main/
│   │   ├── agent/
│   │   │   ├── planner.ts
│   │   │   ├── validation.ts
│   │   │   ├── execution-engine.ts
│   │   │   ├── tools/
│   │   │   ├── approval/
│   │   │   └── verification/
│   │   │
│   │   ├── browser/
│   │   ├── db/
│   │   ├── services/
│   │   └── main.ts
│   │
│   ├── preload/
│   │   └── preload.ts
│   │
│   └── renderer/
│       └── React Application
│
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js 22 or compatible version required by the project.
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/prince-code09/adal-nexus-browser.git
```

### 2. Navigate to the Project

```bash
cd adal-nexus-browser
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Install Playwright Chromium

```bash
npx playwright install chromium
```

### 5. Configure Environment Variables

Create a `.env` file if required by your local configuration.

Add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Keep API keys private. Never commit your `.env` file or expose secret keys in the frontend.

### 6. Run the Application

Start the application using the development command configured in `package.json`:

```bash
npm run dev
```

## Available Scripts

The project includes the following npm scripts where configured:

| Command | Purpose |
|---|---|
| `npm run dev` | Start development environment |
| `npm run dev:vite` | Start Vite development server |
| `npm run dev:electron` | Start Electron application |
| `npm test` | Run tests |
| `npm run build` | Build the application |
| `npm run pack` | Package the application |
| `npm run dist` | Generate distributable builds |

## Example Workflow

A user can provide a natural language instruction such as:

```text
Research five AI startups, collect their company names,
products, pricing information and source URLs,
then save the collected information into a CSV file.
```

The intended workflow is:

1. The user submits an instruction.
2. The AI planner interprets the request.
3. A structured task plan is prepared.
4. The execution engine runs supported browser actions.
5. Relevant information is collected.
6. The verification system checks the execution results.
7. The generated artifact is made available to the user.

## Security and Privacy

Security is an important part of AdaL Nexus.

- Uses Electron's preload and IPC architecture.
- Keeps renderer access restricted.
- Avoids exposing privileged Node.js APIs directly to the frontend.
- Uses validation for structured task inputs.
- Provides approval controls for consequential actions.
- Keeps API keys and sensitive configuration out of source control.

## Future Scope

Potential improvements and future integrations include:

- More advanced AI task planning.
- Improved voice-based interaction.
- More reliable automation and verification.
- Additional third-party service integrations.
- Enhanced research and data extraction capabilities.
- Improved browser session management.

## Project Status

**Version:** 1.0.0  
**Platform:** Windows  
**Project Type:** AI-Powered Autonomous Desktop Browser

---

**AdaL Nexus – Plans. Executes. Verifies.**
