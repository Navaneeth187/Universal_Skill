# Universal Skills — Application User Flows & Operations

This document maps out the operational and interactive pathways of the Universal Skills Chrome extension. It illustrates the sequence of steps, decision trees, and user-facing screens across the system.

---

## 1. Extension Initialization & First Run Flow

When the user first installs the extension, the background worker seeds the database to ensure a plug-and-play experience.

```mermaid
graph TD
    A[User loads unpacked Extension in Chrome] --> B[chrome.runtime.onInstalled Listener fires]
    B --> C{Are default skills present in chrome.storage.local?}
    C -- Yes --> D[Keep existing user library intact]
    C -- No --> E[Seed default templates: Python Expert, UI/UX Critic, Creative Writer]
    E --> F[Initialize empty platformRules and activeSkillsByChat structures]
    D --> G[Extension Ready]
    F --> G
```

---

## 2. Option Console Management Flows (Full-Screen)

The options page (`chrome-extension://.../options/index.html`) is the central database management dashboard.

### 2.1 Skill Creation & Configuration Flow
```mermaid
sequenceDiagram
    actor User
    participant View as Options UI
    participant Storage as chrome.storage.local

    User->>View: Clicks "New Skill" in Editor Workspace
    View->>View: Renders clean markdown editor panel
    User->>View: Inputs Name, Description, Emoji, and Markdown Content
    User->>View: Clicks "Save Skill"
    View->>Storage: Read existing skills array
    View->>View: Generate UUID-based ID (e.g. 'custom-skill-123')
    View->>Storage: Append new Skill card to 'skills' key
    Storage-->>View: Confirm save status
    View->>View: Refresh Library grid and toast "Skill Saved Successfully"
```

### 2.2 Rules Matrix Configuration Flow
The Rules Matrix controls behavior profiles. Users can map any skill to auto-trigger on specific AI models.

```mermaid
graph TD
    A[User navigates to Options -> Rules Matrix] --> B[System loads installed skills & platform rules mapping]
    B --> C[Render grid matching Skills vs. Supported Platforms]
    C --> D[User clicks dropdown for Skill A on ChatGPT]
    D --> E[User chooses: Always On, Always Off, or Ask]
    E --> F[Update local platformRules dictionary: platformRules[skillId][platform] = Choice]
    F --> G[Save platformRules back to chrome.storage.local]
    G --> H[Sync update: Broadcast message ACTIVE_SKILLS_UPDATED to matching open tabs]
```

---

## 3. Popup Panel Control Flows (Browser Toolbar)

The browser Action Popup provides session-specific controls without leaving the active chat tab.

```mermaid
graph TD
    A[User clicks toolbar Extension Icon] --> B[Popup.tsx mounts]
    B --> C[Query active browser tab URL]
    C --> D{Is the tab on a supported AI site?}
    
    D -- No --> E[Render status badge: 'Inactive Platform']
    E --> F[Show instructions to open ChatGPT, Claude, Gemini, etc.]
    
    D -- Yes --> G[Render status badge: 'Active' with Thread Title]
    G --> H[Read thread ID from URL and build unique chatKey]
    H --> I[Fetch activeSkillIds from storage for this chatKey]
    I --> J[Display list of installed skills with checkbox toggles]
    
    J --> K[User toggles checkbox for Skill B]
    K --> L[Update activeSkillIds array for the session]
    L --> M[Save to activeSkillsByChat in chrome.storage.local]
    M --> N[Send ACTIVE_SKILLS_UPDATED to active tab content script]
```

---

## 4. In-Chat Widget & Context Injection Flows (In-Page)

The content script operates directly inside the DOM of the AI platform, overlaying controls and intercepting user actions.

### 4.1 "Ask-to-Activate" Stacking Toast Flow
When navigating to a new conversation where no active skills are set up, the extension prompts the user:

```mermaid
graph TD
    A[User opens a new chat thread] --> B[content.ts detects page change & loads rules]
    B --> C[Loop through installed skills rules for this platform]
    C --> D{Is rule set to 'ask'?}
    
    D -- Yes --> E[Push skill to prompted list and create custom toast element]
    E --> F[Append toast to shadow root .toast-container stack]
    F --> G[Toast displays options: Ignore, Always ON, Enable]
    
    G --> H1[User clicks 'Ignore']
    H1 --> I1[Update rule to 'always-off' in platformRules storage & remove toast]
    
    G --> H2[User clicks 'Always ON']
    H2 --> I2[Update rule to 'always-on' in storage, activate skill for chat, & remove toast]
    
    G --> H3[User clicks 'Enable']
    H3 --> I3[Activate skill for this chat session key only & remove toast]
```

### 4.2 Message Submission & Refresh Interception Flow
This flow intercepts message submissions to append rules, mitigating LLM memory loss/drift.

```mermaid
sequenceDiagram
    actor User
    participant Dom as Content DOM
    participant Script as content.ts
    participant Editor as Text Area Editor
    participant Storage as chrome.storage.local

    User->>Dom: Types message and hits Enter (or clicks Send)
    Script->>Script: Intercept event in capturing phase (stopPropagation)
    Script->>Storage: Retrieve active skills and message count for chatKey
    
    alt Initial prompt (first message of chat)
        Script->>Script: Append full Markdown prompt context at start
        Script->>Script: Set lastInjectedAt = Date.now()
    else Subsequent prompts
        Script->>Script: Increment messageCount
        opt messageCount reaches 6
            Script->>Script: Append suffix: "Skill Alignment Reminder"
            Script->>Script: Reset messageCount = 0
        end
    end

    Script->>Editor: Inject updated text string (dispatch input & change events)
    Script->>Dom: Click submit button programmatically
    Script->>Storage: Save updated message count & injection stats
    Dom-->>User: Message sent with transparent prompt wrapper!
```
