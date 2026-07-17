// Background service worker for Universal Skills Chrome Extension

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

// Initialize default skills if storage is empty
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get(['skills']) as { skills?: Skill[] };
  if (!result.skills || result.skills.length === 0) {
    const defaultSkills: Skill[] = [
      {
        id: 'python-expert',
        name: 'Python Expert',
        description: 'Enforces clean, modern, type-hinted Python 3.11+ code with docstrings, PEP 8 compliance, and robust error handling.',
        version: '1.0.0',
        author: 'Universal Skills',
        content: `# Python Expert Skill\n\nApply the following rules to all Python code you write:\n1. Use modern Python (3.11+) features and type hints for all parameters and return values.\n2. Include descriptive Google-style docstrings for all classes and functions.\n3. Write robust error handling with custom exceptions where appropriate.\n4. Avoid raw loops; prefer list comprehensions, generators, and standard library functional tools.\n5. Follow PEP 8 style guidelines strictly.`,
        systemInstructions: `Apply Python 3.11+ expert rules: use type hints, write Google-style docstrings, follow PEP 8, and use robust error handling.`,
        icon: '🐍',
        createdAt: Date.now()
      },
      {
        id: 'creative-writer',
        name: 'Creative Writer',
        description: 'Steers the AI away from clichés, corporate jargon, and repetitive structures, promoting vivid imagery and engaging hooks.',
        version: '1.0.0',
        author: 'Universal Skills',
        content: `# Creative Writer Skill\n\nWhen writing prose or creative text, follow these rules:\n1. Eliminate corporate jargon, fluff, and robotic transitions (e.g. "In conclusion", "It is important to remember").\n2. Show, don't tell. Focus on vivid sensory details and imagery.\n3. Use active voice and vary sentence structure to create rhythmic flow.\n4. Write strong, arresting opening hooks and clean, resonant endings.\n5. Avoid common AI clichés (e.g. "tapestry", "beacon", "testament to", "delve").`,
        systemInstructions: `Write creatively: avoid corporate jargon and AI clichés (tapestry, delve, etc.), show don't tell, use active voice, and vary sentence structures.`,
        icon: '✍️',
        createdAt: Date.now()
      },
      {
        id: 'ui-ux-critic',
        name: 'UI/UX Design Critic',
        description: 'Analyzes interfaces for usability, visual balance, accessibility (WCAG), and modern aesthetic principles.',
        version: '1.1.0',
        author: 'Universal Skills',
        content: `# UI/UX Design Critic Skill\n\nYou are an elite UI/UX critic. For any UI code, mockup, or description:\n1. Evaluate visual hierarchy, typography contrast, and vertical grid alignment.\n2. Review responsiveness and ease of interaction.\n3. Ensure WCAG 2.1 AA accessibility guidelines are met (color contrast, keyboard focus, screen reader tags).\n4. Highlight micro-interactions or layout details that make the interface feel premium.\n5. Provide actionable feedback with before/after recommendations.`,
        systemInstructions: `Act as an elite UI/UX critic: evaluate hierarchy, contrast, accessibility (WCAG AA), and give actionable before/after layout fixes.`,
        icon: '🎨',
        createdAt: Date.now()
      }
    ];
    await chrome.storage.local.set({ skills: defaultSkills });
  }
});

// Listener for messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'GET_SKILLS') {
    chrome.storage.local.get(['skills'], (result: any) => {
      sendResponse({ skills: result.skills || [] });
    });
    return true; // Keep channel open for async response
  }

  if (message.action === 'SAVE_SKILL') {
    const newSkill: Skill = message.skill;
    chrome.storage.local.get(['skills'], async (result: any) => {
      const skills: Skill[] = result.skills || [];
      const index = skills.findIndex((s: Skill) => s.id === newSkill.id);
      if (index > -1) {
        skills[index] = { ...skills[index], ...newSkill };
      } else {
        skills.push(newSkill);
      }
      await chrome.storage.local.set({ skills });
      sendResponse({ success: true, skills });
    });
    return true;
  }

  if (message.action === 'DELETE_SKILL') {
    const skillId = message.id;
    chrome.storage.local.get(['skills', 'activeSkillsByChat'], async (result: any) => {
      let skills: Skill[] = result.skills || [];
      skills = skills.filter((s: Skill) => s.id !== skillId);
      
      // Clean active skills mapping
      const activeSkillsByChat: { [key: string]: string[] } = result.activeSkillsByChat || {};
      for (const chatKey in activeSkillsByChat) {
        activeSkillsByChat[chatKey] = (activeSkillsByChat[chatKey] || []).filter(
          (id: string) => id !== skillId
        );
      }
      
      await chrome.storage.local.set({ skills, activeSkillsByChat });
      sendResponse({ success: true, skills });
    });
    return true;
  }

  if (message.action === 'GET_ACTIVE_SKILLS') {
    const { chatKey } = message;
    chrome.storage.local.get(['activeSkillsByChat'], (result: any) => {
      const activeSkillsByChat: { [key: string]: string[] } = result.activeSkillsByChat || {};
      sendResponse({ activeSkillIds: activeSkillsByChat[chatKey] || [] });
    });
    return true;
  }

  if (message.action === 'SET_ACTIVE_SKILLS') {
    const { chatKey, activeSkillIds } = message;
    chrome.storage.local.get(['activeSkillsByChat'], async (result: any) => {
      const activeSkillsByChat: { [key: string]: string[] } = result.activeSkillsByChat || {};
      activeSkillsByChat[chatKey] = activeSkillIds;
      await chrome.storage.local.set({ activeSkillsByChat });
      
      // Broadcast to tabs to update content scripts immediately
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'ACTIVE_SKILLS_UPDATED',
              chatKey,
              activeSkillIds
            }).catch(() => {
              // Ignore errors for tabs without active content scripts
            });
          }
        });
      });
      
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'MIGRATE_CHAT_KEY') {
    const { oldKey, newKey } = message;
    chrome.storage.local.get(['activeSkillsByChat', 'chatInjections'], async (result: any) => {
      const activeSkillsByChat: { [key: string]: string[] } = result.activeSkillsByChat || {};
      const chatInjections: { [key: string]: any } = result.chatInjections || {};

      if (activeSkillsByChat[oldKey]) {
        activeSkillsByChat[newKey] = activeSkillsByChat[oldKey];
        delete activeSkillsByChat[oldKey];
      }

      if (chatInjections[oldKey]) {
        chatInjections[newKey] = chatInjections[oldKey];
        delete chatInjections[oldKey];
      }

      await chrome.storage.local.set({ activeSkillsByChat, chatInjections });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'IMPORT_GITHUB_SKILL') {
    const { url } = message;
    fetchGitHubFile(url)
      .then((parsedSkill) => {
        sendResponse({ success: true, skill: parsedSkill });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.action === 'GET_INJECTION_STATE') {
    const { chatKey, skillId } = message;
    chrome.storage.local.get(['chatInjections'], (result: any) => {
      const chatInjections: { [key: string]: any } = result.chatInjections || {};
      const state = chatInjections[chatKey]?.[skillId] || { lastInjectedAt: 0, messageCount: 0 };
      sendResponse({ state });
    });
    return true;
  }

  if (message.action === 'UPDATE_INJECTION_STATE') {
    const { chatKey, skillId, state } = message;
    chrome.storage.local.get(['chatInjections'], async (result: any) => {
      const chatInjections: { [key: string]: any } = result.chatInjections || {};
      if (!chatInjections[chatKey]) {
        chatInjections[chatKey] = {};
      }
      chatInjections[chatKey][skillId] = state;
      await chrome.storage.local.set({ chatInjections });
      sendResponse({ success: true });
    });
    return true;
  }
});

// Helper function to fetch and parse markdown skill files from GitHub
async function fetchGitHubFile(urlStr: string): Promise<Partial<Skill>> {
  let rawUrl = urlStr;
  
  // Transform standard GitHub UI URLs to raw.githubusercontent.com URLs
  if (urlStr.includes('github.com') && !urlStr.includes('raw.githubusercontent.com')) {
    try {
      const parsedUrl = new URL(urlStr);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 4 && pathParts[2] === 'blob') {
        const username = pathParts[0];
        const repo = pathParts[1];
        const branch = pathParts[3];
        const remainingPath = pathParts.slice(4).join('/');
        rawUrl = `https://raw.githubusercontent.com/${username}/${repo}/${branch}/${remainingPath}`;
      }
    } catch {
      throw new Error('Invalid GitHub URL structure.');
    }
  }

  const response = await fetch(rawUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch markdown file from GitHub. Status: ${response.status}`);
  }

  const text = await response.text();
  return parseMarkdownSkill(text, urlStr);
}

// Parses Markdown text to extract Skill structure
function parseMarkdownSkill(markdownText: string, sourceUrl?: string): Partial<Skill> {
  const lines = markdownText.split('\n');
  let name = '';
  let description = '';
  let version = '1.0.0';
  let author = 'GitHub Import';
  let icon = '📖';
  
  // Try to parse YAML frontmatter if exists
  let contentStartIndex = 0;
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
          const val = line.slice(splitIndex + 1).trim().replace(/^['"]|['"]$/g, ''); // strip quotes
          if (key === 'name' || key === 'title') name = val;
          else if (key === 'description') description = val;
          else if (key === 'version') version = val;
          else if (key === 'author') author = val;
          else if (key === 'icon') icon = val;
        }
      }
      contentStartIndex = yamlEndIdx + 1;
    }
  }

  // If name is not found in YAML, search for first # H1 header
  if (!name) {
    for (let i = contentStartIndex; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('# ')) {
        name = trimmed.slice(2).trim();
        break;
      }
    }
  }

  // Fallback name if nothing matches
  if (!name) {
    if (sourceUrl) {
      const parts = sourceUrl.split('/');
      name = parts[parts.length - 1].replace('.md', '').split('-').map(
        p => p.charAt(0).toUpperCase() + p.slice(1)
      ).join(' ');
    } else {
      name = 'Imported Skill';
    }
  }

  // Fallback description from first paragraphs
  const remainingText = lines.slice(contentStartIndex).join('\n');
  if (!description) {
    const paras = remainingText.split('\n\n').map(p => p.trim()).filter(p => p && !p.startsWith('#'));
    description = paras[0] ? paras[0].slice(0, 150) + (paras[0].length > 150 ? '...' : '') : 'A custom imported skill.';
  }

  // Extract a concise systemInstructions summary
  let systemInstructions = markdownText;
  const rulesHeaderIdx = markdownText.toLowerCase().indexOf('## rules');
  const instructionsHeaderIdx = markdownText.toLowerCase().indexOf('## instructions');
  const systemPromptHeaderIdx = markdownText.toLowerCase().indexOf('## system prompt');
  
  const headers = [rulesHeaderIdx, instructionsHeaderIdx, systemPromptHeaderIdx].filter(idx => idx > -1);
  if (headers.length > 0) {
    const earliestHeader = Math.min(...headers);
    systemInstructions = markdownText.slice(earliestHeader).replace(/##\s+.*\n/i, '').trim();
  }
  
  if (systemInstructions.length > 300) {
    systemInstructions = systemInstructions.slice(0, 290) + '... (adhere to full skill rules)';
  }

  // Clean name icon if present inside name
  if (name.match(/^[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/)) {
    const iconMatch = name.match(/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])\s*/);
    if (iconMatch) {
      icon = iconMatch[1];
      name = name.slice(iconMatch[0].length).trim();
    }
  }

  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    name,
    description,
    version,
    author,
    content: markdownText,
    systemInstructions,
    icon,
    githubUrl: sourceUrl,
    createdAt: Date.now()
  };
}
