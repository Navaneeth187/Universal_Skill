// Content script for Universal Skills Chrome Extension

interface Skill {
  id: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  content: string;
  systemInstructions: string;
  icon?: string;
  githubUrl?: string;
  createdAt: number;
}

// Current platform and chat key tracking
let currentPlatform = '';
let currentChatKey = '';
let isWidgetOpen = false;
let customPosition: { left: number; top: number } | null = null;
let isDragging = false;
let installedSkills: Skill[] = [];
let activeSkillIds: string[] = [];
let skillInjectionStates: Record<string, { lastInjectedAt: number; messageCount: number; method: string }> = {};
let refreshInterval = 6;
let protocol8bTemplate = '*Reminder: Maintain all active instructions.*';

// Helper to check if the extension context is still active (not invalidated due to reloads)
function isContextValid(): boolean {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    handleInvalidatedContext();
    return false;
  }
  return true;
}

// Clean up the UI when context is lost to prevent hanging/broken widgets on the page
function handleInvalidatedContext() {
  const widgetRoot = document.getElementById('universal-skills-root');
  if (widgetRoot) {
    console.warn('[Universal Skills] Extension context invalidated. Removing widget UI.');
    widgetRoot.remove();
  }
}

// Safe wrapper for chrome.runtime.sendMessage
async function safeSendMessage(message: any): Promise<any> {
  if (!isContextValid()) return null;
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || '';
          if (errMsg.includes('context invalidated') || errMsg.includes('connection')) {
            handleInvalidatedContext();
          }
          resolve(null);
        } else {
          resolve(response);
        }
      });
    } catch (e: any) {
      if (e.message?.includes('context invalidated')) {
        handleInvalidatedContext();
      }
      resolve(null);
    }
  });
}

// Safe wrapper for chrome.storage.local.get
async function safeGetStorage(keys: string[]): Promise<Record<string, any>> {
  if (!isContextValid()) return {};
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || '';
          if (errMsg.includes('context invalidated')) {
            handleInvalidatedContext();
          }
          resolve({});
        } else {
          resolve(result || {});
        }
      });
    } catch (e: any) {
      if (e.message?.includes('context invalidated')) {
        handleInvalidatedContext();
      }
      resolve({});
    }
  });
}

// Safe wrapper for chrome.storage.local.set
async function safeSetStorage(items: Record<string, any>): Promise<void> {
  if (!isContextValid()) return;
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || '';
          if (errMsg.includes('context invalidated')) {
            handleInvalidatedContext();
          }
        }
        resolve();
      });
    } catch (e: any) {
      if (e.message?.includes('context invalidated')) {
        handleInvalidatedContext();
      }
      resolve();
    }
  });
}

// Detect platform from URL
function detectPlatform(): string {
  const host = window.location.hostname.toLowerCase();
  if (host.includes('chatgpt.com') || host.includes('openai.com')) return 'chatgpt';
  if (host.includes('claude.ai')) return 'claude';
  if (host.includes('gemini.google.com')) return 'gemini';
  if (host.includes('grok.com') || (host.includes('x.com') && window.location.pathname.includes('/grok'))) return 'grok';
  if (host.includes('perplexity.ai')) return 'perplexity';
  if (host.includes('deepseek.com')) return 'deepseek';
  if (host.includes('qwen.ai') || host.includes('qwenlm.ai')) return 'qwen';
  return 'unknown';
}

// Extract conversation ID from URL
function getConversationId(platform: string): string {
  const path = window.location.pathname;
  
  if (platform === 'chatgpt') {
    // URL: chatgpt.com/c/<uuid>
    const match = path.match(/\/c\/([a-f0-9-]+)/i);
    return match ? match[1] : 'new';
  }
  if (platform === 'claude') {
    // URL: claude.ai/chat/<uuid>
    const match = path.match(/\/chat\/([a-f0-9-]+)/i);
    return match ? match[1] : 'new';
  }
  if (platform === 'gemini') {
    // URL: gemini.google.com/app/<id> or gemini.google.com/app
    const match = path.match(/\/app\/([a-f0-9]+)/i);
    return match ? match[1] : 'new';
  }
  if (platform === 'deepseek') {
    // URL: chat.deepseek.com/a/chat/s/<id>
    const match = path.match(/\/a\/chat\/s\/([a-f0-9-]+)/i);
    return match ? match[1] : 'new';
  }
  if (platform === 'grok') {
    // URL: grok.com/chat/<uuid>
    const match = path.match(/\/chat\/([a-f0-9-]+)/i);
    return match ? match[1] : 'new';
  }
  if (platform === 'perplexity') {
    // URL: perplexity.ai/search/<uuid> or perplexity.ai/search
    const match = path.match(/\/search\/([a-f0-9-]+)/i);
    return match ? match[1] : 'new';
  }
  if (platform === 'qwen') {
    // URL: chat.qwen.ai/chat/<uuid> or similar
    const match = path.match(/\/chat\/([a-f0-9-]+)/i);
    return match ? match[1] : 'new';
  }
  
  return 'new';
}

// Get the chat key for settings storage
function getChatKey(): string {
  currentPlatform = detectPlatform();
  const id = getConversationId(currentPlatform);
  return `${currentPlatform}_${id}`;
}

// Styles to inject into Shadow DOM
const WIDGET_STYLES = `
  :host {
    --primary: #6366f1;
    --primary-hover: #4f46e5;
    --bg-dark: #0f172a;
    --bg-card: rgba(30, 41, 59, 0.7);
    --border: rgba(255, 255, 255, 0.08);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --success: #10b981;
    --warning: #f59e0b;
    --font: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    
    font-family: var(--font);
    color: var(--text-main);
  }

  .toast-container {
    position: fixed;
    bottom: 84px;
    right: 24px;
    width: 300px;
    display: flex;
    flex-direction: column-reverse;
    gap: 12px;
    z-index: 999999;
    pointer-events: none;
  }

  .ask-toast {
    width: 100%;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid var(--primary);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    display: none;
    flex-direction: column;
    gap: 12px;
    transition: all 0.3s ease;
    pointer-events: auto;
  }
  .ask-toast.show {
    display: flex;
    animation: slideUp 0.3s ease;
  }
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .toast-title {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--text-main);
  }
  .toast-body {
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.4;
  }
  .toast-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .toast-btn {
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .toast-btn-primary {
    background: var(--primary);
    color: white;
  }
  .toast-btn-primary:hover {
    background: var(--primary-hover);
  }
  .toast-btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-main);
  }
  .toast-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .floating-badge {
    position: fixed;
    top: 24px;
    right: 24px;
    height: 38px;
    padding: 0 14px;
    border-radius: 19px;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: grab;
    z-index: 999999;
    transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s, left 0.3s cubic-bezier(0.16, 1, 0.3, 1), top 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    user-select: none;
    box-sizing: border-box;
  }

  .floating-badge:hover {
    background: #e2e8f0;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
  }

  .floating-badge:active {
    cursor: grabbing;
  }

  .floating-badge.dragging {
    transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s !important;
    cursor: grabbing;
    transform: none !important;
  }

  .floating-badge.open {
    /* Position will be overridden dynamically in JS when dragged, but we keep this class for status tracking */
  }

  .badge-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #94a3b8;
    transition: background-color 0.2s, box-shadow 0.2s;
  }

  .badge-status-dot.active {
    background-color: #10b981;
    box-shadow: 0 0 8px #10b981;
  }

  .badge-text {
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    white-space: nowrap;
  }

  .badge-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .floating-badge.open .badge-chevron {
    transform: rotate(180deg);
  }

  .sidebar-panel {
    position: fixed;
    top: 0;
    right: -380px;
    width: 350px;
    height: 100vh;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(16px) saturate(180%);
    border-left: 1px solid var(--border);
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
    z-index: 999998;
    transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    padding: 24px;
    box-sizing: border-box;
  }

  .sidebar-panel.open {
    right: 0;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }

  .panel-title {
    font-size: 1.25rem;
    font-weight: 700;
    background: linear-gradient(to right, #a5b4fc, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    color: var(--text-main);
    background: rgba(255, 255, 255, 0.08);
  }

  .close-btn svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
    stroke-width: 2;
  }

  .meta-info {
    font-size: 0.75rem;
    color: var(--text-muted);
    background: var(--border);
    padding: 6px 10px;
    border-radius: 6px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .platform-badge {
    text-transform: uppercase;
    font-weight: bold;
    color: var(--primary);
  }

  .section-title {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 12px;
    font-weight: 600;
  }

  .skills-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 4px;
  }

  /* Custom Scrollbar */
  .skills-list::-webkit-scrollbar {
    width: 6px;
  }
  .skills-list::-webkit-scrollbar-track {
    background: transparent;
  }
  .skills-list::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
  }
  .skills-list::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }

  .skill-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: all 0.25s ease;
  }

  .skill-card:hover {
    border-color: rgba(99, 102, 241, 0.4);
    background: rgba(30, 41, 59, 0.9);
  }

  .skill-card.active {
    border-color: var(--primary);
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.15);
  }

  .skill-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }

  .skill-icon-name {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .skill-icon {
    font-size: 1.5rem;
  }

  .skill-name-desc {
    display: flex;
    flex-direction: column;
  }

  .skill-name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .skill-description {
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.3;
    margin-top: 4px;
  }

  /* Toggle Switch */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 38px;
    height: 22px;
    flex-shrink: 0;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.15);
    transition: .3s;
    border-radius: 34px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .3s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: var(--primary);
  }

  input:checked + .slider:before {
    transform: translateX(16px);
  }

  .skill-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    border-top: 1px solid var(--border);
    padding-top: 8px;
    margin-top: 4px;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-muted);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--text-muted);
  }

  .status-dot.active {
    background-color: var(--success);
    box-shadow: 0 0 6px var(--success);
  }

  .status-dot.pending {
    background-color: var(--warning);
    box-shadow: 0 0 6px var(--warning);
  }

  .refresh-setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid var(--border);
  }

  .refresh-text {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .refresh-title {
    font-weight: 500;
    color: var(--text-main);
  }

  .import-section {
    margin-top: 15px;
    border-top: 1px solid var(--border);
    padding-top: 15px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .import-input-group {
    display: flex;
    gap: 6px;
  }

  .import-input {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 0.8rem;
    color: var(--text-main);
    outline: none;
  }

  .import-input:focus {
    border-color: var(--primary);
  }

  .import-btn {
    background: var(--primary);
    border: none;
    color: white;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .import-btn:hover {
    background: var(--primary-hover);
  }

  .no-skills {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85rem;
    padding: 20px 0;
  }

  .feedback-msg {
    font-size: 0.75rem;
    padding: 4px;
    border-radius: 4px;
    margin-top: 4px;
    display: none;
  }
  .feedback-msg.error {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    display: block;
  }
  .feedback-msg.success {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    display: block;
  }
`;

// Inject the floating UI widget into the page
function createInPageWidget() {
  // Check if already injected
  if (document.getElementById('universal-skills-root')) return;

  const root = document.createElement('div');
  root.id = 'universal-skills-root';
  document.body.appendChild(root);

  const shadow = root.attachShadow({ mode: 'open' });
  
  // Style
  const styleTag = document.createElement('style');
  styleTag.textContent = WIDGET_STYLES;
  shadow.appendChild(styleTag);

  // Floating Badge
  const badge = document.createElement('div');
  badge.className = 'floating-badge';
  badge.title = 'Universal Skills Dashboard';
  badge.innerHTML = `
    <div class="badge-status-dot"></div>
    <span class="badge-text">Skills Inactive</span>
    <span class="badge-chevron">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </span>
  `;
  
  // Sidebar Panel
  const panel = document.createElement('div');
  panel.className = 'sidebar-panel';
  
  // Toast Container
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  
  shadow.appendChild(badge);
  shadow.appendChild(panel);
  shadow.appendChild(toastContainer);

  // Apply position and setup drag listeners
  setupDraggableBadge(shadow);
  applyBadgePosition(shadow);

  // Click handlers
  badge.addEventListener('click', () => {
    if (isDragging) {
      isDragging = false;
      return;
    }
    isWidgetOpen = !isWidgetOpen;
    if (isWidgetOpen) {
      panel.classList.add('open');
      badge.classList.add('open');
      renderWidgetContent(shadow);
    } else {
      panel.classList.remove('open');
      badge.classList.remove('open');
    }
    applyBadgePosition(shadow);
  });

  // Read updates from storage
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.skills || changes.activeSkillsByChat) {
      loadState().then(() => {
        updateBadgeState(shadow);
        applyBadgePosition(shadow);
        if (isWidgetOpen) {
          renderWidgetContent(shadow);
        }
      });
    }
  });
}

// Update the status dot, text, and active classes on the badge if skills are active
function updateBadgeState(shadow: ShadowRoot) {
  const dot = shadow.querySelector('.badge-status-dot');
  const textSpan = shadow.querySelector('.badge-text');
  
  if (dot) {
    if (activeSkillIds.length > 0) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  }
  
  if (textSpan) {
    if (activeSkillIds.length > 0) {
      textSpan.textContent = `Skills Active (${activeSkillIds.length})`;
    } else {
      textSpan.textContent = 'Skills Inactive';
    }
  }
  applyBadgePosition(shadow);
}

// Position the badge correctly based on drag position and sidebar state
function applyBadgePosition(shadow: ShadowRoot) {
  const badge = shadow.querySelector('.floating-badge') as HTMLElement;
  if (!badge) return;

  const rect = badge.getBoundingClientRect();
  const badgeWidth = rect.width || 150;

  if (isWidgetOpen) {
    // If the sidebar is open, slide badge left of the sidebar (which is on the right, 350px wide)
    const targetLeft = window.innerWidth - 350 - badgeWidth - 24;
    
    if (customPosition) {
      if (customPosition.left < targetLeft) {
        badge.style.left = `${customPosition.left}px`;
      } else {
        badge.style.left = `${targetLeft}px`;
      }
      badge.style.top = `${customPosition.top}px`;
    } else {
      badge.style.left = `${targetLeft}px`;
      badge.style.top = `24px`;
    }
    badge.style.right = 'auto';
  } else {
    // If closed, restore custom position or use default right-up corner
    if (customPosition) {
      badge.style.left = `${customPosition.left}px`;
      badge.style.top = `${customPosition.top}px`;
      badge.style.right = 'auto';
    } else {
      badge.style.left = 'auto';
      badge.style.right = '24px';
      badge.style.top = '24px';
    }
  }
}

// Bind drag handlers to support moving the badge smoothly
function setupDraggableBadge(shadow: ShadowRoot) {
  const badge = shadow.querySelector('.floating-badge') as HTMLElement;
  if (!badge) return;

  let isPointerDown = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let hasMoved = false;

  const onPointerDown = (e: MouseEvent | TouchEvent) => {
    if (e instanceof MouseEvent && e.button !== 0) return;
    
    isPointerDown = true;
    hasMoved = false;
    isDragging = false;

    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

    startX = clientX;
    startY = clientY;

    const rect = badge.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    badge.classList.add('dragging');
    
    window.addEventListener('mousemove', onPointerMove, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);
  };

  const onPointerMove = (e: MouseEvent | TouchEvent) => {
    if (!isPointerDown) return;

    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMoved = true;
    }

    let newLeft = startLeft + deltaX;
    let newTop = startTop + deltaY;

    // Viewport bounds constraints
    const rect = badge.getBoundingClientRect();
    const minLeft = 12;
    const maxLeft = window.innerWidth - rect.width - 12;
    const minTop = 12;
    const maxTop = window.innerHeight - rect.height - 12;

    newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
    newTop = Math.max(minTop, Math.min(maxTop, newTop));

    badge.style.left = `${newLeft}px`;
    badge.style.top = `${newTop}px`;
    badge.style.right = 'auto';

    customPosition = { left: newLeft, top: newTop };

    if (e.cancelable) {
      e.preventDefault();
    }
  };

  const onPointerUp = () => {
    if (!isPointerDown) return;
    isPointerDown = false;
    badge.classList.remove('dragging');

    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('touchend', onPointerUp);

    if (customPosition) {
      safeSetStorage({ widgetPosition: customPosition });
    }

    if (hasMoved) {
      isDragging = true;
    } else {
      isDragging = false;
    }
  };

  badge.addEventListener('mousedown', onPointerDown);
  badge.addEventListener('touchstart', onPointerDown, { passive: true });
}

let promptedSkillIds = new Set<string>();

function showAskToast(shadow: ShadowRoot, skill: Skill) {
  if (promptedSkillIds.has(skill.id)) return;
  promptedSkillIds.add(skill.id);

  const container = shadow.querySelector('.toast-container');
  if (!container) return;

  let toast = container.querySelector(`#ask-toast-${skill.id}`) as HTMLElement;
  if (!toast) {
    toast = document.createElement('div');
    toast.id = `ask-toast-${skill.id}`;
    toast.className = 'ask-toast';
    container.appendChild(toast);
  }

  toast.innerHTML = `
    <div class="toast-title">Activate ${skill.icon || '🧠'} ${skill.name}?</div>
    <div class="toast-body">Would you like to bind this skill overlay to the current chat session?</div>
    <div class="toast-actions">
      <button class="toast-btn toast-btn-secondary" id="toast-ignore">Ignore</button>
      <button class="toast-btn toast-btn-secondary" id="toast-always">Always ON</button>
      <button class="toast-btn toast-btn-primary" id="toast-enable">Enable</button>
    </div>
  `;

  toast.classList.add('show');

  toast.querySelector('#toast-ignore')?.addEventListener('click', async () => {
    toast.classList.remove('show');
    toast.remove();
    const currentPlatform = detectPlatform();
    const storageData = await safeGetStorage(['platformRules']);
    const platformRules = (storageData.platformRules || {}) as Record<string, Record<string, string>>;
    if (!platformRules[skill.id]) platformRules[skill.id] = {};
    platformRules[skill.id][currentPlatform] = 'always-off';
    await safeSetStorage({ platformRules });
  });

  toast.querySelector('#toast-always')?.addEventListener('click', async () => {
    toast.classList.remove('show');
    toast.remove();
    const currentPlatform = detectPlatform();
    const storageData = await safeGetStorage(['platformRules']);
    const platformRules = (storageData.platformRules || {}) as Record<string, Record<string, string>>;
    if (!platformRules[skill.id]) platformRules[skill.id] = {};
    platformRules[skill.id][currentPlatform] = 'always-on';
    await safeSetStorage({ platformRules });

    if (!activeSkillIds.includes(skill.id)) {
      activeSkillIds.push(skill.id);
      await safeSendMessage({
        action: 'SET_ACTIVE_SKILLS',
        chatKey: currentChatKey,
        activeSkillIds
      });
      triggerAttachmentFlow();
      updateBadgeState(shadow);
      if (isWidgetOpen) renderWidgetContent(shadow);
    }
  });

  toast.querySelector('#toast-enable')?.addEventListener('click', async () => {
    toast.classList.remove('show');
    toast.remove();
    if (!activeSkillIds.includes(skill.id)) {
      activeSkillIds.push(skill.id);
      await safeSendMessage({
        action: 'SET_ACTIVE_SKILLS',
        chatKey: currentChatKey,
        activeSkillIds
      });
      triggerAttachmentFlow();
      updateBadgeState(shadow);
      if (isWidgetOpen) renderWidgetContent(shadow);
    }
  });
}

// Load current state of skills & active skills
async function loadState() {
  try {
    const response = await safeSendMessage({ action: 'GET_SKILLS' });
    installedSkills = response?.skills || [];
    
    currentChatKey = getChatKey();
    
    // Fetch rules matrix, active chats, injection states, widget position, refresh interval, and template
    const storageData = await safeGetStorage(['activeSkillsByChat', 'platformRules', 'chatInjections', 'widgetPosition', 'refreshInterval', 'protocol8bTemplate']);
    const activeSkillsByChat = (storageData.activeSkillsByChat || {}) as Record<string, any>;
    const platformRules = (storageData.platformRules || {}) as Record<string, Record<string, string>>;
    
    if (storageData.widgetPosition) {
      customPosition = storageData.widgetPosition;
    }
    
    if (typeof storageData.refreshInterval === 'number') {
      refreshInterval = storageData.refreshInterval;
    }
    
    if (typeof storageData.protocol8bTemplate === 'string') {
      protocol8bTemplate = storageData.protocol8bTemplate;
    }
    
    // Pre-populate our local skill injection states cache for this chat session
    const chatStates = storageData.chatInjections?.[currentChatKey] || {};
    skillInjectionStates = {};
    for (const skill of installedSkills) {
      skillInjectionStates[skill.id] = chatStates[skill.id] || { lastInjectedAt: 0, messageCount: 0, method: 'prompt' };
    }
    
    const activeResponse = await safeSendMessage({
      action: 'GET_ACTIVE_SKILLS',
      chatKey: currentChatKey
    });
    activeSkillIds = activeResponse?.activeSkillIds || [];
    
    // Check if this chat key has been initialized before
    if (!activeSkillsByChat[currentChatKey]) {
      const initialActiveIds = [...activeSkillIds];
      const platform = detectPlatform();
      
      for (const skill of installedSkills) {
        // Parse supported platforms
        let supportedPlatforms: string[] = [];
        try {
          const lines = skill.content.split('\n');
          if (lines[0]?.trim() === '---') {
            let yamlEndIdx = -1;
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim() === '---') {
                yamlEndIdx = i;
                break;
              }
            }
            if (yamlEndIdx > -1) {
              for (let i = 1; i < yamlEndIdx; i++) {
                const line = lines[i];
                const splitIndex = line.indexOf(':');
                if (splitIndex > -1) {
                  const key = line.slice(0, splitIndex).trim().toLowerCase();
                  const val = line.slice(splitIndex + 1).trim();
                  if (key === 'platforms') {
                    try {
                      supportedPlatforms = JSON.parse(val.replace(/'/g, '"'));
                    } catch {
                      supportedPlatforms = val.replace(/[[\]'"]/g, '').split(',').map(s => s.trim().toLowerCase());
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
        
        if (supportedPlatforms.length === 0) {
          supportedPlatforms = ['chatgpt', 'claude', 'gemini', 'deepseek', 'grok', 'perplexity', 'qwen'];
        }

        const skillRule = platformRules[skill.id]?.[platform];
        // Default to 'ask' if supported, else 'always-off'
        const rule = skillRule || (supportedPlatforms.includes(platform) ? 'ask' : 'always-off');
        
        if (rule === 'always-on') {
          if (!initialActiveIds.includes(skill.id)) {
            initialActiveIds.push(skill.id);
          }
        } else if (rule === 'ask') {
          setTimeout(() => {
            const widgetRoot = document.getElementById('universal-skills-root');
            const shadow = widgetRoot?.shadowRoot;
            if (shadow) {
              showAskToast(shadow, skill);
            }
          }, 1500);
        }
      }
      
      if (initialActiveIds.length !== activeSkillIds.length) {
        activeSkillIds = initialActiveIds;
        await safeSendMessage({
          action: 'SET_ACTIVE_SKILLS',
          chatKey: currentChatKey,
          activeSkillIds
        });
      }
    }
  } catch (e) {
    console.error('[Universal Skills] Failed to load extension state: ', e);
  }
}

// Render content inside the sidebar panel
function renderWidgetContent(shadow: ShadowRoot) {
  const panel = shadow.querySelector('.sidebar-panel');
  if (!panel) return;

  const activePlatform = detectPlatform();
  const currentId = getConversationId(activePlatform);

  panel.innerHTML = `
    <div class="panel-header">
      <div class="panel-title">
        <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2.5;">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        Universal Skills
      </div>
      <button class="close-btn" id="close-sidebar">
        <svg viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    
    <div class="meta-info">
      <span>Platform: <span class="platform-badge">${activePlatform}</span></span>
      <span>Chat ID: ${currentId.substring(0, 8)}${currentId.length > 8 ? '...' : ''}</span>
    </div>

    <div class="section-title">Active Skills for this Chat</div>
    <div class="skills-list">
      ${installedSkills.length === 0 ? '<div class="no-skills">No skills installed yet. Import some from GitHub or the options page!</div>' : ''}
      ${installedSkills.map(skill => {
        const isActive = activeSkillIds.includes(skill.id);
        return `
          <div class="skill-card ${isActive ? 'active' : ''}" data-id="${skill.id}">
            <div class="skill-card-top">
              <div class="skill-icon-name">
                <span class="skill-icon">${skill.icon || '📖'}</span>
                <div class="skill-name-desc">
                  <span class="skill-name">${skill.name}</span>
                  <span class="skill-description">${skill.description}</span>
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" class="skill-toggle" data-id="${skill.id}" ${isActive ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
            ${isActive ? `
              <div class="skill-status" id="status-${skill.id}">
                <div class="status-indicator">
                  <div class="status-dot active"></div>
                  <span class="status-text">Determining status...</span>
                </div>
                <button class="import-btn" style="padding: 2px 6px; font-size: 0.65rem;" id="force-attach-${skill.id}">Force Load</button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>

    <div class="refresh-setting">
      <div class="refresh-text">
        <div class="refresh-title">Lightweight Refreshes</div>
        <div>Remind AI of skills in long conversations</div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" id="refresh-toggle" checked>
        <span class="slider"></span>
      </label>
    </div>

    <div class="import-section">
      <div class="section-title">Import Skill from GitHub</div>
      <div class="import-input-group">
        <input type="text" class="import-input" id="github-url-input" placeholder="https://github.com/.../.md">
        <button class="import-btn" id="import-submit-btn">Import</button>
      </div>
      <div class="feedback-msg" id="import-feedback"></div>
    </div>
  `;

  // Bind close button
  shadow.getElementById('close-sidebar')?.addEventListener('click', () => {
    isWidgetOpen = false;
    panel.classList.remove('open');
    shadow.querySelector('.floating-badge')?.classList.remove('open');
    applyBadgePosition(shadow);
  });

  // Bind toggle switches
  shadow.querySelectorAll('.skill-toggle').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const id = target.getAttribute('data-id');
      if (!id) return;

      let newActiveList = [...activeSkillIds];
      if (target.checked) {
        if (!newActiveList.includes(id)) newActiveList.push(id);
      } else {
        newActiveList = newActiveList.filter(item => item !== id);
      }

      activeSkillIds = newActiveList;
      await safeSendMessage({
        action: 'SET_ACTIVE_SKILLS',
        chatKey: currentChatKey,
        activeSkillIds: newActiveList
      });

      // Rerender to show status indicators
      renderWidgetContent(shadow);
      updateBadgeState(shadow);
      
      // If a skill was enabled, trigger execution attachment check
      if (target.checked) {
        triggerAttachmentFlow();
      }
    });
  });

  // Bind Force Attach button
  installedSkills.forEach(skill => {
    shadow.getElementById(`force-attach-${skill.id}`)?.addEventListener('click', async () => {
      const indicator = shadow.getElementById(`status-${skill.id}`);
      if (indicator) {
        indicator.querySelector('.status-dot')?.setAttribute('class', 'status-dot pending');
        const textSpan = indicator.querySelector('.status-text');
        if (textSpan) textSpan.textContent = 'Attaching skill...';
      }
      
      const success = await performSkillAttachment(skill, true);
      
      if (indicator) {
        const dot = indicator.querySelector('.status-dot');
        const textSpan = indicator.querySelector('.status-text');
        if (success) {
          dot?.setAttribute('class', 'status-dot active');
          if (textSpan) textSpan.textContent = 'Loaded (MD Attached)';
        } else {
          dot?.setAttribute('class', 'status-dot pending');
          if (textSpan) textSpan.textContent = 'Injected (Prompt Fallback)';
        }
      }
    });
  });

  // Bind GitHub import
  const importBtn = shadow.getElementById('import-submit-btn');
  const importInput = shadow.getElementById('github-url-input') as HTMLInputElement;
  const feedback = shadow.getElementById('import-feedback');

  importBtn?.addEventListener('click', async () => {
    const url = importInput?.value.trim();
    if (!url) return;

    if (feedback) {
      feedback.textContent = 'Fetching and parsing...';
      feedback.className = 'feedback-msg success';
    }

    try {
      const response = await safeSendMessage({
        action: 'IMPORT_GITHUB_SKILL',
        url
      });

      if (response && response.success && response.skill) {
        // Save the skill in storage
        await safeSendMessage({
          action: 'SAVE_SKILL',
          skill: response.skill
        });

        if (feedback) {
          feedback.textContent = `Successfully imported "${response.skill.name}"!`;
          feedback.className = 'feedback-msg success';
        }
        if (importInput) importInput.value = '';

        // Reload skills list
        await loadState();
        renderWidgetContent(shadow);
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (e: any) {
      if (feedback) {
        feedback.textContent = `Error: ${e.message}`;
        feedback.className = 'feedback-msg error';
      }
    }
  });

  // Dynamic Status Updates
  installedSkills.forEach(async (skill) => {
    if (activeSkillIds.includes(skill.id)) {
      const statusElement = shadow.getElementById(`status-${skill.id}`);
      if (statusElement) {
        const stateResponse = await safeSendMessage({
          action: 'GET_INJECTION_STATE',
          chatKey: currentChatKey,
          skillId: skill.id
        });
        const state = stateResponse?.state;
        const dot = statusElement.querySelector('.status-dot');
        const textSpan = statusElement.querySelector('.status-text');

        if (state.lastInjectedAt > 0) {
          dot?.setAttribute('class', 'status-dot active');
          if (textSpan) {
            textSpan.textContent = state.method === 'file' ? 'Loaded (MD Attached)' : 'Injected (Prompt)';
          }
        } else {
          dot?.setAttribute('class', 'status-dot pending');
          if (textSpan) textSpan.textContent = 'Pending load';
        }
      }
    }
  });
}

// -------------------------------------------------------------
// Skill Attachment & Injections Core Logic
// -------------------------------------------------------------

// Trigger skill attachment for active skills
async function triggerAttachmentFlow() {
  currentChatKey = getChatKey();
  if (activeSkillIds.length === 0) return;

  for (const skillId of activeSkillIds) {
    const skill = installedSkills.find(s => s.id === skillId);
    if (!skill) continue;

    // Check if already injected
    const stateResponse = await safeSendMessage({
      action: 'GET_INJECTION_STATE',
      chatKey: currentChatKey,
      skillId
    });
    
    const state = stateResponse?.state;
    if (state.lastInjectedAt === 0) {
      // Not yet injected, perform attachment!
      await performSkillAttachment(skill);
    }
  }
}

// Direct value setter bypassing React input bindings with native execCommand and fallback
function injectTextToEditor(editor: HTMLElement, prefix: string, suffix: string) {
  try {
    editor.focus();
    
    let currentVal = '';
    const isTextArea = editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT';
    if (isTextArea) {
      currentVal = (editor as HTMLTextAreaElement).value;
    } else {
      currentVal = editor.innerText || '';
    }

    let targetVal = currentVal;
    if (prefix && !currentVal.includes('[Universal Skill Active:')) {
      targetVal = prefix + targetVal;
    }
    if (suffix && !currentVal.includes('Skill Alignment:')) {
      targetVal = targetVal + suffix;
    }

    if (targetVal === currentVal) return;

    if (isTextArea) {
      const textarea = editor as HTMLTextAreaElement;
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      if (valueSetter) {
        valueSetter.call(textarea, targetVal);
      } else {
        textarea.value = targetVal;
      }
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const ok = document.execCommand('insertText', false, targetVal);
      if (!ok) {
        editor.textContent = targetVal;
        editor.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            inputType: 'insertText',
            data: targetVal
          })
        );
        editor.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  } catch (e) {
    console.warn('[Universal Skills] Failed to inject text into editor: ', e);
  }
}

// Simulates programmatically registering the skill for immediate text injection upon next submit.
async function performSkillAttachment(skill: Skill, _force = false): Promise<boolean> {
  console.log(`[Universal Skills] Skill "${skill.name}" scheduled for prompt-injection upon next message submission.`);
  return true;
}

// -------------------------------------------------------------
// Lightweight Skill Refreshes & Core Interception during conversations
// -------------------------------------------------------------
let submissionListenerBound = false;
let isProgrammaticSubmit = false;

function findChatInput(): HTMLElement | null {
  const selectors = [
    'textarea#prompt-textarea', // ChatGPT
    '#chat-input',              // DeepSeek, generic
    'textarea[placeholder*="message" i]',
    'textarea[placeholder*="ask" i]',
    'textarea[placeholder*="chat" i]',
    'textarea[placeholder*="send" i]',
    'div[contenteditable="true"][role="textbox"]', // Gemini, Claude
    'div[contenteditable="true"]',                 // Fallback contenteditable
    'textarea'                                     // Generic fallback
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;
  }
  return null;
}

function findSubmitButton(): HTMLElement | null {
  const selectors = [
    'button[type="submit"]',
    'button[aria-label*="send" i]',
    'button[aria-label*="submit" i]',
    'button[data-testid*="send" i]',
    'button[data-testid*="submit" i]',
    '[role="button"][aria-label*="send" i]'
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;
  }
  return null;
}

function isAlreadyPrefixed(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.includes('[Universal Skill Active:') || trimmed.includes('Skill Alignment:');
}

function handleSubmissionSync(editor: HTMLElement): boolean {
  if (activeSkillIds.length === 0) return false;

  let prefix = '';
  let suffix = '';
  const updatedStates: Record<string, any> = {};

  for (const skillId of activeSkillIds) {
    const skill = installedSkills.find(s => s.id === skillId);
    if (!skill) continue;

    const state = skillInjectionStates[skillId] || { lastInjectedAt: 0, messageCount: 0, method: 'prompt' };

    if (state.lastInjectedAt === 0) {
      prefix += `[Universal Skill Active: ${skill.name}]\n${skill.content}\n---\n`;
      state.lastInjectedAt = Date.now();
      state.messageCount = 0;
      state.method = 'prompt';
      updatedStates[skillId] = state;
      console.log(`[Universal Skills] Synced initial prompt injection for skill: ${skill.name}`);
    } else {
      state.messageCount = (state.messageCount || 0) + 1;
      if (state.messageCount >= refreshInterval) {
        const textSnippet = skill.systemInstructions || 'Please follow active guidelines.';
        const reminderPrompt = protocol8bTemplate
          .replace(/{name}/g, skill.name)
          .replace(/{skill_name}/g, skill.name)
          .replace(/{instructions}/g, textSnippet)
          .replace(/{snippet}/g, textSnippet)
          .replace(/{system_instructions}/g, textSnippet);
        suffix += `\n\n${reminderPrompt}`;
        state.messageCount = 0;
        console.log(`[Universal Skills] Synced periodic refresh reminder for skill: ${skill.name}`);
      }
      updatedStates[skillId] = state;
    }

    // Cache updated state locally
    skillInjectionStates[skillId] = state;
  }

  if (prefix || suffix) {
    injectTextToEditor(editor, prefix, suffix);

    // Save updated states asynchronously back to background storage (chrome.storage.local)
    safeGetStorage(['chatInjections']).then((result) => {
      const allStates = result.chatInjections || {};
      allStates[currentChatKey] = {
        ...(allStates[currentChatKey] || {}),
        ...updatedStates
      };
      safeSetStorage({ chatInjections: allStates });
    });

    return true;
  }

  return false;
}

function setupSubmissionInterceptor() {
  if (submissionListenerBound) return;
  submissionListenerBound = true;

  // Intercept submit keydown (Enter) in capture phase
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing) {
      if (isProgrammaticSubmit) return;

      const target = e.target as HTMLElement;
      if (target.matches('textarea, [contenteditable="true"]')) {
        let text = '';
        if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
          text = (target as HTMLTextAreaElement).value;
        } else {
          text = target.innerText || '';
        }

        if (!text.trim() || isAlreadyPrefixed(text)) return;

        const injected = handleSubmissionSync(target);
        if (injected) {
          e.preventDefault();
          e.stopImmediatePropagation();

          isProgrammaticSubmit = true;
          const submitBtn = findSubmitButton();
          setTimeout(() => {
            if (submitBtn) {
              submitBtn.click();
            } else {
              for (const type of ['keydown', 'keyup']) {
                target.dispatchEvent(
                  new KeyboardEvent(type, {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                  })
                );
              }
            }
            setTimeout(() => {
              isProgrammaticSubmit = false;
            }, 80);
          }, 30);
        }
      }
    }
  }, true);

  // Intercept send button clicks in capture phase
  document.addEventListener('click', (e) => {
    if (isProgrammaticSubmit) return;

    const target = e.target as HTMLElement;
    const submitBtn = target.closest('button[type="submit"], button[aria-label*="send" i], button[aria-label*="submit" i]') as HTMLElement;
    if (submitBtn) {
      const editor = findChatInput();
      if (editor) {
        let text = '';
        if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
          text = (editor as HTMLTextAreaElement).value;
        } else {
          text = editor.innerText || '';
        }

        if (!text.trim() || isAlreadyPrefixed(text)) return;

        const injected = handleSubmissionSync(editor);
        if (injected) {
          e.preventDefault();
          e.stopImmediatePropagation();

          isProgrammaticSubmit = true;
          setTimeout(() => {
            submitBtn.click();
            setTimeout(() => {
              isProgrammaticSubmit = false;
            }, 80);
          }, 30);
        }
      }
    }
  }, true);
}

// Listen to message updates from the background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'ACTIVE_SKILLS_UPDATED') {
    if (message.chatKey === currentChatKey) {
      activeSkillIds = message.activeSkillIds || [];
      const widgetRoot = document.getElementById('universal-skills-root');
      if (widgetRoot && widgetRoot.shadowRoot) {
        updateBadgeState(widgetRoot.shadowRoot);
        applyBadgePosition(widgetRoot.shadowRoot);
        if (isWidgetOpen) {
          renderWidgetContent(widgetRoot.shadowRoot);
        }
      }
      triggerAttachmentFlow();
    }
    sendResponse({ success: true });
  }
});

// URL polling change detection (to handle single page application navigation)
let previousUrl = window.location.href;
function checkUrlChange() {
  const currentUrl = window.location.href;
  if (currentUrl !== previousUrl) {
    const oldKey = currentChatKey;
    previousUrl = currentUrl;
    
    // Recalculate chat key
    currentChatKey = getChatKey();
    
    // If we transition from new draft page to a specific conversation page, migrate settings
    if (oldKey.endsWith('_new') && !currentChatKey.endsWith('_new') && oldKey.split('_')[0] === currentChatKey.split('_')[0]) {
      console.log(`[Universal Skills] Migrating skill state from draft chat to: ${currentChatKey}`);
      safeSendMessage({
        action: 'MIGRATE_CHAT_KEY',
        oldKey,
        newKey: currentChatKey
      }).then((response) => {
        if (response) {
          initializeContentScript();
        }
      });
    } else {
      initializeContentScript();
    }
  }
}

// Main initialisation sequence
async function initializeContentScript() {
  await loadState();
  createInPageWidget();
  setupSubmissionInterceptor();
  
  const widgetRoot = document.getElementById('universal-skills-root');
  if (widgetRoot && widgetRoot.shadowRoot) {
    updateBadgeState(widgetRoot.shadowRoot);
    applyBadgePosition(widgetRoot.shadowRoot);
    if (isWidgetOpen) {
      renderWidgetContent(widgetRoot.shadowRoot);
    }
  }
  
  // Perform check for immediate injection (if there are active skills on page load)
  setTimeout(() => {
    triggerAttachmentFlow();
  }, 2000);
}

// Run initial loading sequence
initializeContentScript();
setInterval(checkUrlChange, 1000);
