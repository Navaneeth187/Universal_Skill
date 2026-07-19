import { useEffect, useState } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Download, 
  Upload, 
  X, 
  Sliders,
  BookOpen
} from 'lucide-react';

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

const PLATFORMS = [
  { id: 'chatgpt', name: 'ChatGPT', color: '#10a37f' },
  { id: 'claude', name: 'Claude', color: '#d97706' },
  { id: 'gemini', name: 'Gemini', color: '#2563eb' },
  { id: 'deepseek', name: 'DeepSeek', color: '#0891b2' },
  { id: 'grok', name: 'Grok', color: '#7c3aed' },
  { id: 'perplexity', name: 'Perplexity', color: '#0f766e' },
  { id: 'qwen', name: 'Qwen', color: '#4f46e5' }
];

const COMMUNITY_SKILLS: Skill[] = [
  {
    id: 'python-expert',
    name: 'Senior Python Architect',
    description: 'Enforces clean, modern, type-hinted Python 3.11+ code with docstrings, PEP 8 compliance, and robust error tracking.',
    version: '3.4.2',
    author: 'Arjun',
    content: `# Senior Python Architect\n\nApply the following rules to all Python code you write:\n1. Use modern Python (3.11+) features and type hints for all parameters and return values.\n2. Include descriptive Google-style docstrings for all classes and functions.\n3. Write robust error handling with custom exceptions where appropriate.\n4. Avoid raw loops; prefer list comprehensions, generators, and standard library functional tools.\n5. Follow PEP 8 style guidelines strictly.`,
    systemInstructions: `Apply Python 3.11+ expert rules: use type hints, write Google-style docstrings, follow PEP 8, and use robust error handling.`,
    icon: '🐍',
    createdAt: Date.now()
  },
  {
    id: 'creative-writer',
    name: 'Creative Content Copywriter',
    description: 'Steers the AI away from clichés, corporate jargon, and repetitive structures, promoting vivid imagery and engaging hooks.',
    version: '1.5.0',
    author: 'CopyPro',
    content: `# Creative Content Copywriter\n\nWhen writing prose or creative text, follow these rules:\n1. Eliminate corporate jargon, fluff, and robotic transitions (e.g. "In conclusion", "It is important to remember").\n2. Show, don't tell. Focus on vivid sensory details and imagery.\n3. Use active voice and vary sentence structure to create rhythmic flow.\n4. Write strong, arresting opening hooks and clean, resonant endings.\n5. Avoid common AI clichés (e.g. "tapestry", "beacon", "testament to", "delve").`,
    systemInstructions: `Write creatively: avoid corporate jargon and AI clichés (tapestry, delve, etc.), show don't tell, use active voice, and vary sentence structures.`,
    icon: '✍️',
    createdAt: Date.now()
  },
  {
    id: 'ui-ux-critic',
    name: 'UI/UX Design Critic',
    description: 'Analyzes interfaces for usability, visual balance, accessibility (WCAG), and modern aesthetic principles.',
    version: '1.2.0',
    author: 'DesignGuru',
    content: `# UI/UX Design Critic\n\nYou are an elite UI/UX critic. For any UI code, mockup, or description:\n1. Evaluate visual hierarchy, typography contrast, and vertical grid alignment.\n2. Review responsiveness and ease of interaction.\n3. Ensure WCAG 2.1 AA accessibility guidelines are met (color contrast, keyboard focus, screen reader tags).\n4. Highlight micro-interactions or layout details that make the interface feel premium.\n5. Provide actionable feedback with before/after recommendations.`,
    systemInstructions: `Act as an elite UI/UX critic: evaluate hierarchy, contrast, accessibility (WCAG AA), and give actionable before/after layout fixes.`,
    icon: '🎨',
    createdAt: Date.now()
  },
  {
    id: 'sql-sage',
    name: 'SQL Analytics Sage',
    description: 'Optimizes query structures for PostgreSQL/BigQuery, adds clean comments, and avoids common query anti-patterns.',
    version: '1.0.2',
    author: 'DataTeam',
    content: `# SQL Analytics Sage\n\nWhen writing SQL queries, follow these guidelines:\n1. Always format queries with uppercase keywords (SELECT, JOIN, WHERE).\n2. Use descriptive table aliases and fully qualify column names.\n3. Optimize joins and use CTEs (Common Table Expressions) instead of nested subqueries for readability.\n4. Handle potential null values explicitly with COALESCE or NULLIF.\n5. Use window functions (ROW_NUMBER, LEAD, LAG) efficiently instead of self-joins where possible.`,
    systemInstructions: `Optimize SQL: uppercase keywords, use CTEs, alias columns, qualify tables, avoid self-joins, handle null values.`,
    icon: '📊',
    createdAt: Date.now()
  },
  {
    id: 'typescript-wizard',
    name: 'TypeScript & React Wizard',
    description: 'Enforces clean React code under TypeScript rules. Avoids `any`, prefers functional declarations and clean hooks management.',
    version: '2.1.0',
    author: 'DevTeam',
    content: `# TypeScript & React Wizard\n\nFollow these rules when constructing React components:\n1. Use exact prop interfaces. Never use 'any' or loose types.\n2. Implement React.FC or simple functional definitions with destructured props.\n3. Keep hooks clean; extract complex handlers or side-effects to custom hooks.\n4. Avoid direct state mutation; use immutability conventions strictly.\n5. Optimize rendering with useMemo and useCallback for intensive calculations.`,
    systemInstructions: `TS React conventions: use strict typing (no any), separate logic to hooks, functional definitions, useMemo/useCallback optimization.`,
    icon: '⚛️',
    createdAt: Date.now()
  }
];

export default function Options() {
  const [sidebarTab, setSidebarTab] = useState<'library' | 'workspace' | 'matrix' | 'onboarding'>('library');
  const [editorTab, setEditorTab] = useState<'info' | 'prompt' | 'testing' | 'rules'>('info');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Rules Matrix states
  const [platformRules, setPlatformRules] = useState<{ [skillId: string]: { [platform: string]: 'always-on' | 'always-off' | 'ask' } }>({});
  
  // Editor form states
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [author, setAuthor] = useState('');
  const [icon, setIcon] = useState('🧠');
  const [content, setContent] = useState('');
  const [instructions, setInstructions] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  // Settings states
  const [refreshInterval, setRefreshInterval] = useState(6);
  const [protocol8bTemplate, setProtocol8bTemplate] = useState('*Reminder: Maintain all active instructions.*');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'engineering' | 'creative' | 'data' | 'design'>('all');
  const [onboardingStep, setOnboardingStep] = useState(1);

  // Testing pane simulation states
  const [testPlatform, setTestPlatform] = useState('claude');
  const [testProtocol, setTestProtocol] = useState<'8a' | '8b'>('8a');

  // Simulated Private plate OAuth modal
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [oauthToken, setOauthToken] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    loadSkills();
    loadSettings();
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const loadSkills = async () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'GET_SKILLS' }, (response) => {
        if (response && response.skills) {
          setSkills(response.skills);
          if (response.skills.length > 0 && !selectedSkill) {
            setSelectedSkill(response.skills[0]);
          }
        }
      });
    }
  };

  const loadSettings = async () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['refreshInterval', 'theme', 'protocol8bTemplate']) as { refreshInterval?: number; theme?: 'light' | 'dark'; protocol8bTemplate?: string };
      if (result.refreshInterval) {
        setRefreshInterval(result.refreshInterval);
      }
      if (result.theme) {
        setTheme(result.theme);
      } else {
        setTheme('light');
      }
      if (result.protocol8bTemplate) {
        setProtocol8bTemplate(result.protocol8bTemplate);
      }
    }
  };

  const loadRules = async () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['platformRules']) as { platformRules?: any };
      if (result.platformRules) {
        setPlatformRules(result.platformRules);
      }
    }
  };

  const saveSettings = async (val: number) => {
    setRefreshInterval(val);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ refreshInterval: val });
      showStatus('Refresh interval updated successfully!', 'success');
    }
  };

  const saveTemplate = async (val: string) => {
    setProtocol8bTemplate(val);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ protocol8bTemplate: val });
    }
  };

  const saveRuleValue = async (skillId: string, platform: string, value: 'always-on' | 'always-off' | 'ask') => {
    const updated = {
      ...platformRules,
      [skillId]: {
        ...(platformRules[skillId] || {}),
        [platform]: value
      }
    };
    setPlatformRules(updated);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ platformRules: updated });
    }
    showStatus('Platform rule updated!', 'success');
  };

  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ theme: nextTheme });
    }
  };

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSelectSkill = (skill: Skill) => {
    setSelectedSkill(skill);
    setIsEditing(false);
    setSidebarTab('workspace');
  };

  const handleStartEdit = (skill: Skill) => {
    setName(skill.name);
    setDesc(skill.description);
    setVersion(skill.version || '1.0.0');
    setAuthor(skill.author || '');
    setIcon(skill.icon || '🧠');
    setContent(skill.content);
    setInstructions(skill.systemInstructions);
    setGithubUrl(skill.githubUrl || '');
    setIsEditing(true);
    setSidebarTab('workspace');
  };

  const handleStartCreate = () => {
    setName('');
    setDesc('');
    setVersion('1.0.0');
    setAuthor('');
    setIcon('🧠');
    setContent('# New Skill\n\nWrite your prompt instructions here.');
    setInstructions('');
    setGithubUrl('');
    setSelectedSkill(null);
    setIsEditing(true);
    setSidebarTab('workspace');
    setEditorTab('info');
  };

  const handleSaveSkill = () => {
    if (!name.trim() || !content.trim()) {
      showStatus('Name and Content are required.', 'error');
      return;
    }

    const id = selectedSkill ? selectedSkill.id : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    let sysInstructions = instructions.trim();
    if (!sysInstructions) {
      sysInstructions = content.slice(0, 200) + (content.length > 200 ? '...' : '');
    }

    const updatedSkill: Skill = {
      id,
      name: name.trim(),
      description: desc.trim() || 'Custom user skill.',
      version: version.trim(),
      author: author.trim() || 'Local User',
      icon: icon.trim(),
      content: content.trim(),
      systemInstructions: sysInstructions,
      githubUrl: githubUrl.trim(),
      createdAt: selectedSkill ? selectedSkill.createdAt : Date.now()
    };

    chrome.runtime.sendMessage({
      action: 'SAVE_SKILL',
      skill: updatedSkill
    }, (response) => {
      if (response && response.success) {
        setSkills(response.skills);
        const saved = response.skills.find((s: Skill) => s.id === id);
        if (saved) {
          setSelectedSkill(saved);
        }
        setIsEditing(false);
        showStatus('Skill saved successfully!', 'success');
      } else {
        showStatus('Failed to save skill.', 'error');
      }
    });
  };

  const handleDeleteSkill = (skill: Skill) => {
    if (confirm(`Are you sure you want to delete "${skill.name}"?`)) {
      chrome.runtime.sendMessage({
        action: 'DELETE_SKILL',
        id: skill.id
      }, (response) => {
        if (response && response.success) {
          setSkills(response.skills);
          if (response.skills.length > 0) {
            setSelectedSkill(response.skills[0]);
          } else {
            setSelectedSkill(null);
          }
          setIsEditing(false);
          showStatus('Skill deleted.', 'success');
        }
      });
    }
  };

  // Pre-load community library index
  const handlePreloadCommunity = async () => {
    for (const skill of COMMUNITY_SKILLS) {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'SAVE_SKILL',
          skill
        }, resolve);
      });
    }
    loadSkills();
    showStatus('Pre-loaded 5 skills into registry!', 'success');
  };

  // GitHub sync
  const [gitSyncUrl, setGitSyncUrl] = useState('');
  const handleGitHubSync = async () => {
    if (!gitSyncUrl.trim()) return;
    showStatus('Syncing remote file...', 'success');
    
    chrome.runtime.sendMessage({
      action: 'IMPORT_GITHUB_SKILL',
      url: gitSyncUrl.trim()
    }, (response) => {
      if (response && response.success && response.skill) {
        chrome.runtime.sendMessage({
          action: 'SAVE_SKILL',
          skill: response.skill
        }, (saveResponse) => {
          if (saveResponse && saveResponse.success) {
            setSkills(saveResponse.skills);
            const saved = saveResponse.skills.find((s: Skill) => s.id === response.skill.id);
            if (saved) setSelectedSkill(saved);
            setGitSyncUrl('');
            showStatus(`Successfully synced "${response.skill.name}"!`, 'success');
          }
        });
      } else {
        showStatus(response?.error || 'Failed to sync from GitHub', 'error');
      }
    });
  };

  // Simulated Private GitHub Plate Sync
  const handlePrivateOAuthSync = () => {
    if (!oauthToken.trim()) {
      showStatus('Personal access token is required.', 'error');
      return;
    }
    setOauthLoading(true);
    setTimeout(() => {
      setOauthLoading(false);
      setShowOAuthModal(false);
      setOauthToken('');
      handlePreloadCommunity();
      showStatus('Personal workflows synced successfully!', 'success');
    }, 1500);
  };

  // Export all skills as a backup JSON file
  const handleExportBackup = () => {
    const backupData = JSON.stringify(skills, null, 2);
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `universal-skills-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Skills configuration exported!', 'success');
  };

  // Import backup JSON file
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const list = JSON.parse(e.target?.result as string) as Skill[];
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item.name && item.content) {
              await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                  action: 'SAVE_SKILL',
                  skill: item
                }, resolve);
              });
            }
          }
          loadSkills();
          showStatus(`Imported ${list.length} skills successfully!`, 'success');
        } else {
          showStatus('Invalid backup file structure.', 'error');
        }
      } catch {
        showStatus('Failed to parse backup JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Filter logic
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (categoryFilter === 'all') return matchesSearch;
    
    // Tag checking
    const nameStr = skill.name.toLowerCase();
    const descStr = skill.description.toLowerCase();
    
    if (categoryFilter === 'engineering') {
      return matchesSearch && (nameStr.includes('python') || nameStr.includes('code') || nameStr.includes('typescript') || nameStr.includes('sql') || descStr.includes('code') || descStr.includes('pep'));
    }
    if (categoryFilter === 'creative') {
      return matchesSearch && (nameStr.includes('writer') || nameStr.includes('creative') || descStr.includes('prose') || descStr.includes('writer'));
    }
    if (categoryFilter === 'data') {
      return matchesSearch && (nameStr.includes('sql') || nameStr.includes('analytics') || descStr.includes('query') || descStr.includes('postgresql'));
    }
    if (categoryFilter === 'design') {
      return matchesSearch && (nameStr.includes('design') || nameStr.includes('ui') || nameStr.includes('ux') || descStr.includes('wcag'));
    }
    return matchesSearch;
  });

  const themeVars = theme === 'light' ? {
    '--bg': '#f8fafc',
    '--text-primary': '#0f172a',
    '--text-secondary': '#334155',
    '--text-muted': '#64748b',
    '--bg-header': '#ffffff',
    '--bg-sidebar': '#f1f5f9',
    '--bg-panel': '#ffffff',
    '--border': '#cbd5e1',
    '--card-bg': '#ffffff',
    '--card-border': '#cbd5e1',
    '--card-active-bg': '#e0e7ff',
    '--card-active-border': '#6366f1',
    '--button-secondary-bg': '#f1f5f9',
    '--button-secondary-border': '#cbd5e1',
    '--button-secondary-text': '#334155',
    '--input-bg': '#ffffff',
    '--input-border': '#cbd5e1',
    '--input-text': '#0f172a',
    '--code-bg': '#f1f5f9',
    '--code-text': '#0f172a',
    '--code-border': '#cbd5e1',
    '--shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    '--logo-title': 'linear-gradient(to right, #0f172a, #334155)',
    '--glow': 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0) 70%)'
  } : {
    '--bg': '#090d16',
    '--text-primary': '#f8fafc',
    '--text-secondary': '#cbd5e1',
    '--text-muted': '#94a3b8',
    '--bg-header': 'rgba(3, 7, 18, 0.6)',
    '--bg-sidebar': 'rgba(3, 7, 18, 0.2)',
    '--bg-panel': '#050810',
    '--border': 'rgba(255, 255, 255, 0.05)',
    '--card-bg': 'rgba(255, 255, 255, 0.015)',
    '--card-border': 'rgba(255, 255, 255, 0.04)',
    '--card-active-bg': 'rgba(99, 102, 241, 0.06)',
    '--card-active-border': '#6366f1',
    '--button-secondary-bg': 'rgba(255, 255, 255, 0.04)',
    '--button-secondary-border': 'rgba(255, 255, 255, 0.08)',
    '--button-secondary-text': '#cbd5e1',
    '--input-bg': 'rgba(255, 255, 255, 0.02)',
    '--input-border': 'rgba(255, 255, 255, 0.06)',
    '--input-text': 'white',
    '--code-bg': 'rgba(255, 255, 255, 0.008)',
    '--code-text': '#e2e8f0',
    '--code-border': 'rgba(255, 255, 255, 0.03)',
    '--shadow': 'none',
    '--logo-title': 'linear-gradient(to right, #f8fafc, #cbd5e1)',
    '--glow': 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)'
  };

  return (
    <div style={{ ...containerStyle, ...themeVars } as React.CSSProperties}>
      {/* Top Banner */}
      <header style={headerStyle}>
        <div style={logoContainerStyle}>
          <div style={logoBadgeStyle}>
            <Layers size={22} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={logoTitleStyle}>Universal Skills v3.0</h1>
            <p style={logoSubtitleStyle}>The Intelligent AI Alignment Workspace</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {statusMessage && (
            <div style={statusBannerStyle(statusMessage.type)}>
              {statusMessage.text}
            </div>
          )}
          <button onClick={toggleTheme} style={secondaryBtnStyle} title="Toggle Dark/Light theme">
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <button onClick={handleExportBackup} style={secondaryBtnStyle} title="Backup configurations">
            <Download size={14} style={{ marginRight: '6px' }} />
            Export
          </button>
          <label style={{ ...secondaryBtnStyle, cursor: 'pointer' }} title="Import backup configurations">
            <Upload size={14} style={{ marginRight: '6px' }} />
            Import
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportBackup} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div style={gridStyle}>
        
        {/* Left Navigation bar strip */}
        <aside style={navSidebarStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 12px' }}>
            <button 
              className="premium-sidebar-btn"
              onClick={() => { setSidebarTab('library'); setIsEditing(false); }} 
              style={sidebarTab === 'library' ? activeNavBtnStyle : navBtnStyle}
            >
              <Layers size={18} />
              <span>Full Library</span>
            </button>
            <button 
              className="premium-sidebar-btn"
              onClick={() => { setSidebarTab('workspace'); }} 
              style={sidebarTab === 'workspace' ? activeNavBtnStyle : navBtnStyle}
            >
              <Edit3 size={18} />
              <span>Editor Workspace</span>
            </button>
            <button 
              className="premium-sidebar-btn"
              onClick={() => { setSidebarTab('matrix'); setIsEditing(false); }} 
              style={sidebarTab === 'matrix' ? activeNavBtnStyle : navBtnStyle}
            >
              <Sliders size={18} />
              <span>Rules Matrix</span>
            </button>
            <button 
              className="premium-sidebar-btn"
              onClick={() => { setSidebarTab('onboarding'); setIsEditing(false); }} 
              style={sidebarTab === 'onboarding' ? activeNavBtnStyle : navBtnStyle}
            >
              <BookOpen size={18} />
              <span>Onboarding Setup</span>
            </button>
          </div>

          <div style={{ flex: 1 }} />

          {/* Quick info widget */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <div>MV3 Protocol Activated</div>
            <div style={{ marginTop: '4px' }}>Local-First Sandbox</div>
          </div>
        </aside>

        {/* Tab Panel Content */}
        <main style={mainContentStyle}>

          {/* 1. Full Library Panel */}
          {sidebarTab === 'library' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px' }}>
              {skills.length === 0 ? (
                /* Panel 5: Library Empty State */
                <div style={emptyLibraryContainerStyle}>
                  <div style={emptyLibraryIconStyle}>📚</div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Your Library is Empty</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px', maxWidth: '400px', lineHeight: '1.5' }}>
                    Please import or create a skill to support your interactions. No local prompt alignment profiles found.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '320px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={labelStyle}>Import From GitHub / Public URL</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input 
                          type="text" 
                          placeholder="Paste GitHub raw markdown URL..."
                          value={gitSyncUrl}
                          onChange={(e) => setGitSyncUrl(e.target.value)}
                          style={inputStyle}
                        />
                        <button onClick={handleGitHubSync} style={primaryBtnStyle}>Fetch</button>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0' }} />

                    <button 
                      onClick={() => setShowOAuthModal(true)} 
                      style={{ ...secondaryBtnStyle, justifyContent: 'center', padding: '10px' }}
                    >
                      🔑 Insert My Private Plate (GitHub Sync)
                    </button>
                    
                    <button 
                      onClick={handlePreloadCommunity} 
                      style={{ ...primaryBtnStyle, justifyContent: 'center', padding: '10px', backgroundColor: '#4f46e5' }}
                    >
                      🚀 Cache Community Core Templates
                    </button>
                  </div>
                </div>
              ) : (
                /* 3. Full Skill Library view */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={libraryHeaderStyle}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Registered AI Skills</h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Manage behavior overlays dynamically across browser sessions</p>
                    </div>
                    
                    <button onClick={handleStartCreate} style={primaryBtnStyle}>
                      <Plus size={14} style={{ marginRight: '4px' }} />
                      Create New Skill
                    </button>
                  </div>

                  {/* Filters Bar */}
                  <div style={filtersBarStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(['all', 'engineering', 'creative', 'data', 'design'] as const).map(cat => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          style={categoryFilter === cat ? activeFilterBtnStyle : filterBtnStyle}
                        >
                          {cat.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <input 
                      type="text" 
                      placeholder="Search active library..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ ...inputStyle, width: '220px', padding: '6px 12px' }}
                    />
                  </div>

                  {/* Skills Grid */}
                  <div style={libraryGridStyle}>
                    {filteredSkills.map(skill => {
                      return (
                        <div key={skill.id} style={libraryCardStyle}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '2rem' }}>{skill.icon || '🧠'}</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => handleStartEdit(skill)} style={cardIconBtnStyle} title="Edit workspace">
                                <Edit3 size={14} />
                              </button>
                              <button onClick={() => handleDeleteSkill(skill)} style={cardIconBtnStyle} title="Delete skill">
                                <Trash2 size={14} color="#ef4444" />
                              </button>
                            </div>
                          </div>

                          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '12px 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {skill.name}
                            <span style={{ fontSize: '0.7rem', background: 'var(--code-bg)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                              v{skill.version || '1.0.0'}
                            </span>
                          </h3>

                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, flex: 1, lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                            {skill.description}
                          </p>

                          <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0 0 0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>By {skill.author || 'Dev'}</span>
                            <button 
                              onClick={() => handleSelectSkill(skill)} 
                              style={{ border: 'none', backgroundColor: 'transparent', color: '#6366f1', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              Open Editor ➜
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {filteredSkills.length === 0 && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                        No matching skills found in cache registry.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Editor Workspace Panel */}
          {sidebarTab === 'workspace' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {!selectedSkill && !isEditing ? (
                <div style={emptyLibraryContainerStyle}>
                  <div style={emptyLibraryIconStyle}>🛠️</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '12px 0' }}>No Skill Selected</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                    Select a skill from the library or click below to build a customized alignment matrix.
                  </p>
                  <button onClick={handleStartCreate} style={primaryBtnStyle}>Construct New Skill</button>
                </div>
              ) : (
                /* Multi-View Workspace */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  
                  {/* Workspace Header */}
                  <div style={workspaceHeaderStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.75rem' }}>{icon || '🧠'}</span>
                      <div>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                          {isEditing ? (selectedSkill ? `Editing "${name}"` : 'Construct New Skill') : selectedSkill?.name}
                        </h2>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                          Local registry ID: <code style={{ color: '#6366f1' }}>{selectedSkill?.id || 'new-profile'}</code>
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {isEditing ? (
                        <>
                          <button onClick={() => setIsEditing(false)} style={cancelBtnStyle}>
                            <X size={14} style={{ marginRight: '4px' }} />
                            Cancel
                          </button>
                          <button onClick={handleSaveSkill} style={saveBtnStyle}>
                            <Save size={14} style={{ marginRight: '4px' }} />
                            Save Skill
                          </button>
                        </>
                      ) : (
                        selectedSkill && (
                          <button onClick={() => handleStartEdit(selectedSkill)} style={{ ...primaryBtnStyle, backgroundColor: '#6366f1' }}>
                            <Edit3 size={14} style={{ marginRight: '4px' }} />
                            Edit Details
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Multi-view Tabs */}
                  <div style={workspaceTabsStyle}>
                    <button 
                      onClick={() => setEditorTab('info')} 
                      style={editorTab === 'info' ? activeWorkspaceTabStyle : workspaceTabStyle}
                    >
                      General Info
                    </button>
                    <button 
                      onClick={() => setEditorTab('prompt')} 
                      style={editorTab === 'prompt' ? activeWorkspaceTabStyle : workspaceTabStyle}
                    >
                      Core Prompt (MD)
                    </button>
                    <button 
                      onClick={() => setEditorTab('testing')} 
                      style={editorTab === 'testing' ? activeWorkspaceTabStyle : workspaceTabStyle}
                    >
                      Testing & Mockup
                    </button>
                    <button 
                      onClick={() => setEditorTab('rules')} 
                      style={editorTab === 'rules' ? activeWorkspaceTabStyle : workspaceTabStyle}
                    >
                      Platform Rules
                    </button>
                  </div>

                  {/* Workspace Content Panels */}
                  <div style={workspaceBodyStyle}>

                    {/* Tab 1: General Info */}
                    {editorTab === 'info' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
                        <div style={formGroupStyle}>
                          <label style={labelStyle}>Skill Icon (Emoji/Unicode)</label>
                          <input 
                            type="text" 
                            value={icon}
                            onChange={(e) => setIcon(e.target.value)}
                            disabled={!isEditing}
                            style={inputStyle}
                          />
                        </div>

                        <div style={formGroupStyle}>
                          <label style={labelStyle}>Skill Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Senior Python Architect"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={!isEditing}
                            style={inputStyle}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div style={formGroupStyle}>
                            <label style={labelStyle}>Version</label>
                            <input 
                              type="text" 
                              value={version}
                              onChange={(e) => setVersion(e.target.value)}
                              disabled={!isEditing}
                              style={inputStyle}
                            />
                          </div>
                          <div style={formGroupStyle}>
                            <label style={labelStyle}>Author</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Arjun"
                              value={author}
                              onChange={(e) => setAuthor(e.target.value)}
                              disabled={!isEditing}
                              style={inputStyle}
                            />
                          </div>
                        </div>

                        <div style={formGroupStyle}>
                          <label style={labelStyle}>Brief Description</label>
                          <input 
                            type="text" 
                            placeholder="Enforces code review best practices..."
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            disabled={!isEditing}
                            style={inputStyle}
                          />
                        </div>

                        <div style={formGroupStyle}>
                          <label style={labelStyle}>GitHub Sync upstream (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="https://github.com/user/skills/blob/main/skill.md"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            disabled={!isEditing}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Core Prompt (Markdown Split Pane) */}
                    {editorTab === 'prompt' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '100%' }}>
                        
                        {/* Left Side: Raw text area editor */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={labelStyle}>Raw Markdown Instructions</label>
                          <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={!isEditing}
                            style={{ ...textareaStyle, flex: 1, minHeight: '300px' }}
                            placeholder="# System instructions..."
                          />
                          
                          <label style={{ ...labelStyle, marginTop: '10px' }}>Protocol 8b: Lightweight Refresh Token Snippet</label>
                          <textarea
                            rows={2}
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            disabled={!isEditing}
                            style={{ ...textareaStyle, height: '60px' }}
                            placeholder="Adhere to system Python specifications."
                          />
                        </div>

                        {/* Right Side: Live HTML preview */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
                          <label style={labelStyle}>Live Markdown Render Preview</label>
                          <div style={markdownPreviewContainerStyle}>
                            <MarkdownPreview content={content || '# No Content\nType in the left editor pane to see live parsed markdown here.'} />
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Tab 3: Testing & Preview Mockups */}
                    {editorTab === 'testing' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={labelStyle}>Mock AI Interface:</span>
                            <select 
                              value={testPlatform} 
                              onChange={(e) => setTestPlatform(e.target.value)}
                              style={selectStyle}
                            >
                              {PLATFORMS.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={labelStyle}>Simulation Protocol:</span>
                            <button
                              onClick={() => setTestProtocol('8a')}
                              style={testProtocol === '8a' ? activeToggleBtnStyle : toggleBtnStyle}
                            >
                              Protocol 8a (Chat Start)
                            </button>
                            <button
                              onClick={() => setTestProtocol('8b')}
                              style={testProtocol === '8b' ? activeToggleBtnStyle : toggleBtnStyle}
                            >
                              Protocol 8b (Token Refresh)
                            </button>
                          </div>
                        </div>

                        {/* Visual mockup window */}
                        <div style={mockWindowStyle}>
                          <div style={mockWindowHeaderStyle}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '6px', backgroundColor: '#ff5f56' }} />
                              <div style={{ width: '12px', height: '12px', borderRadius: '6px', backgroundColor: '#ffbd2e' }} />
                              <div style={{ width: '12px', height: '12px', borderRadius: '6px', backgroundColor: '#27c93f' }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                              Simulated {PLATFORMS.find(p => p.id === testPlatform)?.name} Browser View
                            </span>
                            <div style={{ width: '36px' }} />
                          </div>

                          <div style={mockWindowBodyStyle}>
                            
                            {testProtocol === '8a' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.05)', padding: '12px 16px', borderRadius: '12px', maxWidth: '80%', fontSize: '0.85rem' }}>
                                  Hello! I have loaded your alignment profile configuration. How can I assist you today?
                                </div>
                                
                                <div style={{ border: '1px dashed #6366f1', borderRadius: '8px', padding: '10px', background: 'rgba(99, 102, 241, 0.04)', fontSize: '0.75rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>📎</span>
                                  <span>
                                    <strong>File Attached dynamically (Protocol 8a):</strong> {name || 'Skill'}.md ({Math.round((content?.length || 0)/100)/10} KB)
                                  </span>
                                </div>

                                <div style={{ alignSelf: 'flex-end', background: '#6366f1', color: 'white', padding: '12px 16px', borderRadius: '12px', maxWidth: '80%', fontSize: '0.85rem' }}>
                                  Let's begin. Review my code requirements defined in the file.
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', margin: '10px 0' }}>
                                  —— 6 Messages Transmitted (Threshold Met) ——
                                </div>

                                <div style={{ alignSelf: 'flex-end', background: '#6366f1', color: 'white', padding: '12px 16px', borderRadius: '12px', maxWidth: '80%', fontSize: '0.85rem' }}>
                                  Now refactor my async call block.
                                  
                                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '8px', paddingTop: '6px', fontSize: '0.7rem', color: '#c7d2fe', fontStyle: 'italic' }}>
                                    {protocol8bTemplate
                                      .replace(/{name}/g, name || 'Skill')
                                      .replace(/{skill_name}/g, name || 'Skill')
                                      .replace(/{instructions}/g, instructions || 'Please follow active guidelines.')
                                      .replace(/{snippet}/g, instructions || 'Please follow active guidelines.')
                                      .replace(/{system_instructions}/g, instructions || 'Please follow active guidelines.')
                                    }
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 4: Platform Rules Matrix (per-skill configuration) */}
                    {editorTab === 'rules' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Behavior Rules for "{name || 'Skill'}"</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                          Configure how this specific skill is bound when launching chats on different LLM interfaces.
                        </p>

                        <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginTop: '10px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '12px 16px' }}>AI Platform</th>
                                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Injection Option</th>
                              </tr>
                            </thead>
                            <tbody>
                              {PLATFORMS.map(platform => {
                                const currentRule = selectedSkill ? (platformRules[selectedSkill.id]?.[platform.id] || 'ask') : 'ask';
                                return (
                                  <tr key={platform.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: platform.color }} />
                                      <span style={{ fontWeight: 600 }}>{platform.name}</span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                      <select
                                        value={currentRule}
                                        onChange={(e) => {
                                          if (selectedSkill) {
                                            saveRuleValue(selectedSkill.id, platform.id, e.target.value as any);
                                          }
                                        }}
                                        style={selectStyle}
                                      >
                                        <option value="always-on">Always ON (Auto-inject)</option>
                                        <option value="ask">Ask (Notify overlay)</option>
                                        <option value="always-off">Always OFF (Blacklist)</option>
                                      </select>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Platform Rules Matrix Panel (Global controls) */}
          {sidebarTab === 'matrix' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Platform Deployment Matrix</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 16px 0' }}>
                  Define routing parameters globally for all installed skills across platforms
                </p>
              </div>

              {/* Protocol settings widget */}
              <div style={globalSettingsCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Sliders size={16} color="#6366f1" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Protocol 8b: Variable-Based Refresh Interval</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                  To maintain system alignment without exceeding token budgets, the extension appends a lightweight token reminder block every $N$ messages.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.8rem' }}>Transmit reminder every:</span>
                  <input 
                    type="range" 
                    min="2" 
                    max="30" 
                    value={refreshInterval}
                    onChange={(e) => saveSettings(parseInt(e.target.value) || 6)}
                    style={{ cursor: 'pointer', width: '150px' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1' }}>{refreshInterval} messages</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Global Reminder Prompt Template:</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Define the phrasing of the system reminder sent every {refreshInterval} messages. Use <code>{"{name}"}</code> for skill name and <code>{"{instructions}"}</code> for the skill's specific reminder snippet.
                  </span>
                  <textarea
                    rows={3}
                    value={protocol8bTemplate}
                    onChange={(e) => saveTemplate(e.target.value)}
                    style={{ ...textareaStyle, fontFamily: 'monospace', fontSize: '0.8rem', marginTop: '4px', width: '100%', boxSizing: 'border-box' }}
                    placeholder='*Reminder: Maintain all active instructions.*'
                  />
                </div>
              </div>

              {skills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No skills in registry yet. Preload community library to see matrix.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', marginTop: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '12px 16px' }}>Skill Profile</th>
                        {PLATFORMS.map(p => (
                          <th key={p.id} style={{ textAlign: 'center', padding: '12px' }}>{p.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {skills.map(skill => (
                        <tr key={skill.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.25rem' }}>{skill.icon || '🧠'}</span>
                            <span style={{ fontWeight: 600 }}>{skill.name}</span>
                          </td>
                          {PLATFORMS.map(p => {
                            const val = platformRules[skill.id]?.[p.id] || 'ask';
                            return (
                              <td key={p.id} style={{ padding: '8px', textAlign: 'center' }}>
                                <select
                                  value={val}
                                  onChange={(e) => saveRuleValue(skill.id, p.id, e.target.value as any)}
                                  style={{ ...selectStyle, fontSize: '0.75rem', padding: '4px 6px' }}
                                >
                                  <option value="always-on">On</option>
                                  <option value="ask">Ask</option>
                                  <option value="always-off">Off</option>
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. Onboarding Setup Panel */}
          {sidebarTab === 'onboarding' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflowY: 'auto' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Onboarding & First-Run Setup Guide</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 16px 0' }}>
                  Learn how flat Markdown files align AI workflows locally and securely
                </p>
              </div>

              {/* Wizard Steps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div 
                  style={{ ...(onboardingStep === 1 ? activeWizardCardStyle : wizardCardStyle), cursor: 'pointer' }}
                  onClick={() => setOnboardingStep(1)}
                >
                  <div style={wizardStepBadgeStyle(1, onboardingStep)}>1</div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '8px 0 4px 0' }}>Install & Pin Extension</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                    Verify the browser badge is active. Toggle settings, reload matching pages.
                  </p>
                </div>

                <div 
                  style={{ ...(onboardingStep === 2 ? activeWizardCardStyle : wizardCardStyle), cursor: 'pointer' }}
                  onClick={() => setOnboardingStep(2)}
                >
                  <div style={wizardStepBadgeStyle(2, onboardingStep)}>2</div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '8px 0 4px 0' }}>Configure Matrix Rules</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                    Set platforms defaults like "Always ON", "Always OFF" or "Ask" per skill.
                  </p>
                </div>

                <div 
                  style={{ ...(onboardingStep === 3 ? activeWizardCardStyle : wizardCardStyle), cursor: 'pointer' }}
                  onClick={() => setOnboardingStep(3)}
                >
                  <div style={wizardStepBadgeStyle(3, onboardingStep)}>3</div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '8px 0 4px 0' }}>Create or Import</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                    Write custom rules in the editor, sync from git branches, or load library.
                  </p>
                </div>
              </div>

              {/* Asset caching mechanism */}
              <div style={globalSettingsCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Asset Caching Mechanism v3.0</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                      Optimize performance by pre-loading official indexes directly into the sandbox registry.
                    </p>
                  </div>
                  <button onClick={handlePreloadCommunity} style={primaryBtnStyle}>
                    Pre-load & Cache Library Index
                  </button>
                </div>
              </div>

              {/* FAQs section */}
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💡 Help & Documentation
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={faqCardStyle}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 4px 0' }}>What is Protocol 8a vs 8b?</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                      <strong>Protocol 8a</strong> performs a full skill load during initial conversation setup (attaching as a file). 
                      <strong>Protocol 8b</strong> sends lightweight reminder triggers periodically to prevent the model from drifting.
                    </p>
                  </div>

                  <div style={faqCardStyle}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 4px 0' }}>Does my prompt data go to the cloud?</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                      No. The extension is completely local-first. All prompts, file injections, and configurations are handled directly within the browser client storage sandbox.
                    </p>
                  </div>

                  <div style={faqCardStyle}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 4px 0' }}>How do I sync with GitHub?</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                      Enter the raw URL of any markdown file in the import dashboard. The extension parses frontmatter properties and versions automatically.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Simulated GitHub OAuth modal */}
      {showOAuthModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Simulated GitHub OAuth Matrix</h3>
              <button onClick={() => setShowOAuthModal(false)} style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              Connect your private repositories to fetch private markdown prompt rules securely.
            </p>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Personal Access Token (PAT) / OAuth Key</label>
              <input 
                type="password" 
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={oauthToken}
                onChange={(e) => setOauthToken(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowOAuthModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handlePrivateOAuthSync} disabled={oauthLoading} style={primaryBtnStyle}>
                {oauthLoading ? 'Authenticating...' : 'Authorize & Sync Plates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Markdown Render Utility
// -------------------------------------------------------------
function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div style={{ textAlign: 'left', lineHeight: '1.6', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          return <h1 key={idx} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginTop: '16px', marginBottom: '8px', fontSize: '1.4rem', fontWeight: 700 }}>{trimmed.slice(2)}</h1>;
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={idx} style={{ marginTop: '14px', marginBottom: '6px', fontSize: '1.2rem', fontWeight: 700 }}>{trimmed.slice(3)}</h2>;
        }
        if (trimmed.startsWith('### ')) {
          return <h3 key={idx} style={{ marginTop: '12px', marginBottom: '6px', fontSize: '1.05rem', fontWeight: 700 }}>{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith('> ')) {
          return <blockquote key={idx} style={{ borderLeft: '3px solid #6366f1', paddingLeft: '10px', color: 'var(--text-muted)', margin: '8px 0', fontStyle: 'italic', background: 'var(--code-bg)', padding: '6px 10px', borderRadius: '4px' }}>{trimmed.slice(2)}</blockquote>;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return <li key={idx} style={{ marginLeft: '16px', listStyleType: 'disc', fontSize: '0.85rem' }}>{trimmed.slice(2)}</li>;
        }
        if (trimmed.match(/^\d+\.\s/)) {
          const numMatch = trimmed.match(/^\d+\.\s(.*)/);
          return <li key={idx} style={{ marginLeft: '16px', listStyleType: 'decimal', fontSize: '0.85rem' }}>{numMatch ? numMatch[1] : trimmed}</li>;
        }
        if (trimmed === '---') {
          return <hr key={idx} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />;
        }
        if (!trimmed) {
          return <div key={idx} style={{ height: '6px' }} />;
        }
        return <p key={idx} style={{ margin: '4px 0', fontSize: '0.85rem' }} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(trimmed) }} />;
      })}
    </div>
  );
}

function parseInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background: var(--code-bg); padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.8rem;">$1</code>');
}

// -------------------------------------------------------------
// Options Page Dashboard CSS Styles
// -------------------------------------------------------------
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  width: '100vw',
  backgroundColor: 'var(--bg)',
  color: 'var(--text-primary)',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  boxSizing: 'border-box',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 24px',
  backgroundColor: 'var(--bg-header)',
  borderBottom: '1px solid var(--border)',
  boxSizing: 'border-box',
  zIndex: 10
};

const logoContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const logoBadgeStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)'
};

const logoTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.05rem',
  fontWeight: 700,
  background: 'var(--logo-title)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const logoSubtitleStyle: React.CSSProperties = {
  margin: '2px 0 0 0',
  fontSize: '0.75rem',
  color: 'var(--text-muted)'
};

const statusBannerStyle = (type: 'success' | 'error'): React.CSSProperties => {
  return {
    fontSize: '0.75rem',
    color: type === 'success' ? '#10b981' : '#ef4444',
    backgroundColor: type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
    border: `1px solid ${type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
    padding: '6px 12px',
    borderRadius: '8px',
  };
};

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: '#6366f1',
  border: 'none',
  color: 'white',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.2s ease',
  gap: '6px'
};

const secondaryBtnStyle: React.CSSProperties = {
  backgroundColor: 'var(--button-secondary-bg)',
  border: '1px solid var(--button-secondary-border)',
  color: 'var(--button-secondary-text)',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.2s ease',
  gap: '6px'
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '220px 1fr',
  flex: 1,
  boxSizing: 'border-box',
  overflow: 'hidden'
};

const navSidebarStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-sidebar)',
  borderRight: '1px solid var(--border)',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
};

const navBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '12px 16px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '8px',
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  fontWeight: 500,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const activeNavBtnStyle: React.CSSProperties = {
  ...navBtnStyle,
  backgroundColor: 'var(--card-active-bg)',
  color: 'var(--text-primary)',
  fontWeight: 600
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: 'var(--bg-panel)',
  boxSizing: 'border-box',
  overflowY: 'auto',
  position: 'relative'
};

const emptyLibraryContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  padding: '48px',
  textAlign: 'center',
  height: '80%'
};

const emptyLibraryIconStyle: React.CSSProperties = {
  fontSize: '3.5rem',
  marginBottom: '20px',
  filter: 'drop-shadow(0 4px 12px rgba(99, 102, 241, 0.2))'
};

const libraryHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px'
};

const filtersBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 18px',
  backgroundColor: 'var(--bg-sidebar)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  marginBottom: '24px'
};

const filterBtnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  padding: '6px 12px',
  borderRadius: '6px',
  transition: 'all 0.2s ease'
};

const activeFilterBtnStyle: React.CSSProperties = {
  ...filterBtnStyle,
  background: 'var(--bg-header)',
  color: '#6366f1',
  boxShadow: 'var(--shadow)'
};

const libraryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '20px',
  overflowY: 'auto',
  paddingBottom: '32px'
};

const libraryCardStyle: React.CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '12px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: 'var(--shadow-sm)',
  transition: 'all 0.2s ease',
  position: 'relative'
};

const cardIconBtnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  fontWeight: 600,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const inputStyle: React.CSSProperties = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.85rem',
  color: 'var(--input-text)',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
  transition: 'all 0.2s ease'
};

const selectStyle: React.CSSProperties = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '0.85rem',
  color: 'var(--input-text)',
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const workspaceHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid var(--border)',
};

const workspaceTabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '20px',
  padding: '0 24px',
  borderBottom: '1px solid var(--border)',
  backgroundColor: 'var(--bg-sidebar)'
};

const workspaceTabStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  padding: '14px 4px',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  transition: 'all 0.2s ease'
};

const activeWorkspaceTabStyle: React.CSSProperties = {
  ...workspaceTabStyle,
  color: '#6366f1',
  borderBottomColor: '#6366f1'
};

const workspaceBodyStyle: React.CSSProperties = {
  flex: 1,
  padding: '24px',
  overflowY: 'auto',
  boxSizing: 'border-box'
};

const formGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const textareaStyle: React.CSSProperties = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: '8px',
  padding: '12px 14px',
  fontSize: '0.85rem',
  color: 'var(--input-text)',
  outline: 'none',
  resize: 'none',
  fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
  boxSizing: 'border-box',
  lineHeight: '1.5',
  transition: 'all 0.2s ease'
};

const cancelBtnStyle: React.CSSProperties = {
  backgroundColor: 'var(--button-secondary-bg)',
  border: '1px solid var(--button-secondary-border)',
  color: 'var(--button-secondary-text)',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s ease'
};

const saveBtnStyle: React.CSSProperties = {
  backgroundColor: '#10b981',
  border: 'none',
  color: 'white',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s ease'
};

const markdownPreviewContainerStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--code-bg)',
  border: '1px solid var(--code-border)',
  borderRadius: '8px',
  padding: '20px',
  overflowY: 'auto',
  boxSizing: 'border-box',
  maxHeight: '450px'
};

const toggleBtnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  cursor: 'pointer',
  fontWeight: 500,
  transition: 'all 0.2s ease'
};

const activeToggleBtnStyle: React.CSSProperties = {
  ...toggleBtnStyle,
  backgroundColor: '#6366f1',
  color: 'white',
  borderColor: '#6366f1'
};

const mockWindowStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '12px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: 'var(--shadow-md)',
  flex: 1
};

const mockWindowHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 18px',
  backgroundColor: 'var(--bg-sidebar)',
  borderBottom: '1px solid var(--border)'
};

const mockWindowBodyStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-panel)',
  padding: '24px',
  fontFamily: "'Inter', sans-serif",
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  overflowY: 'auto',
  height: '260px'
};

const globalSettingsCardStyle: React.CSSProperties = {
  background: 'var(--code-bg)',
  border: '1px solid var(--code-border)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px'
};

const wizardCardStyle: React.CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '12px',
  padding: '20px',
  position: 'relative',
  transition: 'all 0.2s ease'
};

const activeWizardCardStyle: React.CSSProperties = {
  ...wizardCardStyle,
  borderColor: '#6366f1',
  boxShadow: 'var(--active-glow)'
};

const wizardStepBadgeStyle = (step: number, activeStep: number): React.CSSProperties => {
  const isActive = step === activeStep;
  return {
    width: '26px',
    height: '26px',
    borderRadius: '8px',
    backgroundColor: isActive ? '#6366f1' : 'var(--border)',
    color: isActive ? 'white' : 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 700,
    transition: 'all 0.2s ease'
  };
};

const faqCardStyle: React.CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '10px',
  padding: '16px 20px'
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(3, 7, 18, 0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '28px',
  width: '440px',
  boxShadow: 'var(--shadow-md)'
};
