# Developer Onboarding Prompt & Codebase Context

> **System Instruction for the AI Assistant:**
> You are an elite AI system expert pair-programming on the **Universal Skills Chrome Extension**.
> Read this onboarding document carefully to absorb the architecture, state synchronization protocols, folder layout, message structures, and development guidelines. Keep this active in your context window for all developer requests.

---

## 1. Codebase Overview

Universal Skills is a Manifest V3 browser extension built with **Vite, React 19, TypeScript, and Tailwind/Vanilla CSS**. It enables users to register custom Prompt Modules (.md files) and load/inject them dynamically inside AI text areas (ChatGPT, Claude, Gemini, etc.).

### Folder Structure
* `public/`
  * `manifest.json`: Defines extension metadata, script injections, permissions (`storage`, `activeTab`, `tabs`, `unlimitedStorage`), and host overrides.
* `src/`
  * `background/background.ts`: The Service Worker handling CRUD, state storage, and GitHub repository URL importing/parsing.
  * `content-scripts/content.ts`: Injected script running in AI chat pages. Renders a Shadow DOM floating badge/sidebar and intercepts user input submissions.
  * `popup/`: Small React application rendering the toolbar popup (`Popup.tsx`, `main.tsx`, `index.html`).
  * `options/`: Full-page dashboard console (`Options.tsx`, `main.tsx`, `index.html`).
  * `index.css`: Defines styling variables, HSL Tailwind color palettes, and global light/dark theme schemes.

---

## 2. State & Storage Architecture

All state is local-first, utilizing `chrome.storage.local`.

### Local Storage Keys
1. **`skills`** (`Skill[]`): Installed prompt cards.
2. **`activeSkillsByChat`** (`Record<string, string[]>`): `chatKey` -> list of enabled skill IDs.
   * `chatKey` is computed as `${platform}_${conversationId}` (e.g. `chatgpt_9a4f-561b` or `claude_new`).
3. **`platformRules`** (`Record<string, Record<string, 'always-on' | 'always-off' | 'ask'>>`): Skill-to-Platform mappings.
4. **`chatInjections`** (`Record<string, Record<string, { lastInjectedAt: number; messageCount: number; method: string }>>`): Tracks current conversation prompt injections to schedule reminders.

---

## 3. Communication Protocols (Message Passing)

Components exchange structured JSON payloads via Chrome runtime API.

### Common Messages
* **`GET_SKILLS`**: Sent from frontend -> background to retrieve installed skills.
  * *Response*: `{ skills: Skill[] }`
* **`SAVE_SKILL`**: Sent from frontend -> background to save/update a skill card.
  * *Request*: `{ action: 'SAVE_SKILL', skill: Skill }`
  * *Response*: `{ success: true, skills: Skill[] }`
* **`DELETE_SKILL`**: Sent from frontend -> background to delete a skill.
  * *Request*: `{ action: 'DELETE_SKILL', id: string }`
* **`GET_ACTIVE_SKILLS` / `SET_ACTIVE_SKILLS`**: Fetch or assign active skills for a specific `chatKey`.
  * *Request*: `{ action: 'SET_ACTIVE_SKILLS', chatKey: string, activeSkillIds: string[] }`
* **`ACTIVE_SKILLS_UPDATED`**: Broadcast from background worker to content scripts in active tabs.
  * *Request*: `{ action: 'ACTIVE_SKILLS_UPDATED', chatKey: string, activeSkillIds: string[] }`
* **`IMPORT_GITHUB_SKILL`**: Sent to background to pull and parse a raw markdown file from GitHub.
  * *Request*: `{ action: 'IMPORT_GITHUB_SKILL', url: string }`
  * *Response*: `{ success: true, skill: Partial<Skill> }` or `{ success: false, error: string }`

---

## 4. Key Development Rules & Guidelines

When modifying or expanding the codebase:
1. **No External Imports in Content Script**: `content.ts` runs directly inside hostile DOMs. Minimize dependencies to keep it lightweight, and enclose all UI HTML elements inside a **Shadow DOM** (`#universal-skills-root`) to prevent CSS overrides from the host page (like ChatGPT or Claude).
2. **Handle React Input Binding State**: When injecting text into rich contenteditable boxes (e.g., Claude's ProseMirror or Gemini's editor), simple value assignments will not trigger React state changes. You must dispatch `input` and `change` events programmatically, or use fallback commands like `document.execCommand('insertText')` as implemented in `injectTextToEditor`.
3. **Remember the Execution Policies**:
   * Windows restricts running Powershell scripts (`npm.ps1`). Always execute npm scripts utilizing `npm.cmd <script>` instead of plain `npm`.
   * To build the project, run: `npm.cmd run build`.
   * To verify warnings or syntax compliance, run: `npm.cmd run lint`.
4. **Theme Synchronization**: The Options and Popup windows must read the `theme` key from local storage and update `data-theme` on the `document.documentElement` to allow Vanilla HSL color switching:
   ```typescript
   document.documentElement.setAttribute('data-theme', theme);
   ```

---

## 5. Quick Troubleshooting Matrix

* **Problem**: Text is injected but gets wiped out when clicking Send.
  * *Solution*: React/ProseMirror binding state bypassed. Inspect `injectTextToEditor` inside `content.ts`. Ensure both `input` and `change` events are correctly dispatched.
* **Problem**: Toasts are stacking on top of each other.
  * *Solution*: Check that `toast-container` is present in the shadow root. Toasts are dynamically appended to this container and aligned in `column-reverse` order to stack nicely.
* **Problem**: A new conversation is started, but settings didn't sync.
  * *Solution*: Verify `checkUrlChange` interval (1s) and `MIGRATE_CHAT_KEY` execution. SPA URL transitions should move parameters from `<platform>_new` to `<platform>_<id>` automatically.
