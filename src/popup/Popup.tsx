import { useEffect, useState } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  ExternalLink, 
  FileText, 
  Sliders, 
  Sparkles, 
  BookOpen,
  Info,
  Save,
  AlertCircle
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

export default function Popup() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'manage' | 'import-create'>('dashboard');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeTabPlatform, setActiveTabPlatform] = useState<string | null>(null);
  const [activeTabTitle, setActiveTabTitle] = useState<string>('No AI platform detected');
  const [activeTabChatKey, setActiveTabChatKey] = useState<string | null>(null);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // light is default
  
  // Import/Create Form States
  const [githubUrl, setGithubUrl] = useState('');
  const [importStatus, setImportStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Editor/Create form
  const [editSkillId, setEditSkillId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVersion, setEditVersion] = useState('1.0.0');
  const [editAuthor, setEditAuthor] = useState('');
  const [editIcon, setEditIcon] = useState('🧠');
  const [editContent, setEditContent] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editorStatus, setEditorStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load skills and check current active browser tab
  useEffect(() => {
    loadSkills();
    detectActiveTab();
    loadTheme();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const loadTheme = async () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['theme']) as { theme?: 'light' | 'dark' };
      if (result.theme) {
        setTheme(result.theme);
      } else {
        setTheme('light');
      }
    }
  };

  const loadSkills = async () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'GET_SKILLS' }, (response) => {
        if (response && response.skills) {
          setSkills(response.skills);
        }
      });
    }
  };

  const detectActiveTab = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url) {
          try {
            const urlObj = new URL(tab.url);
            const host = urlObj.hostname.toLowerCase();
            let detected: string | null = null;
            let pathId = 'new';
            
            if (host.includes('chatgpt.com') || host.includes('openai.com')) {
              detected = 'chatgpt';
              const match = urlObj.pathname.match(/\/c\/([a-f0-9-]+)/i);
              if (match) pathId = match[1];
            } else if (host.includes('claude.ai')) {
              detected = 'claude';
              const match = urlObj.pathname.match(/\/chat\/([a-f0-9-]+)/i);
              if (match) pathId = match[1];
            } else if (host.includes('gemini.google.com')) {
              detected = 'gemini';
              const match = urlObj.pathname.match(/\/app\/([a-f0-9]+)/i);
              if (match) pathId = match[1];
            } else if (host.includes('perplexity.ai')) {
              detected = 'perplexity';
              const match = urlObj.pathname.match(/\/search\/([a-f0-9-]+)/i);
              if (match) pathId = match[1];
            } else if (host.includes('grok.com') || (host.includes('x.com') && urlObj.pathname.includes('/grok'))) {
              detected = 'grok';
              const match = urlObj.pathname.match(/\/chat\/([a-f0-9-]+)/i);
              if (match) pathId = match[1];
            } else if (host.includes('deepseek.com')) {
              detected = 'deepseek';
              const match = urlObj.pathname.match(/\/a\/chat\/s\/([a-f0-9-]+)/i);
              if (match) pathId = match[1];
            } else if (host.includes('qwen.ai') || host.includes('qwenlm.ai')) {
              detected = 'qwen';
              const match = urlObj.pathname.match(/\/chat\/([a-f0-9-]+)/i);
              if (match) pathId = match[1];
            }

            if (detected) {
              setActiveTabPlatform(detected);
              const chatKey = `${detected}_${pathId}`;
              setActiveTabChatKey(chatKey);
              setActiveTabTitle(tab.title || `${detected.toUpperCase()} Thread`);
              
              // Load active skills for this chat key
              chrome.runtime.sendMessage({ action: 'GET_ACTIVE_SKILLS', chatKey }, (response) => {
                if (response && response.activeSkillIds) {
                  setActiveSkillIds(response.activeSkillIds);
                }
              });
            }
          } catch (e) {
            console.error('[Popup] URL parse error:', e);
          }
        }
      });
    }
  };

  const handleToggleSkill = async (skillId: string) => {
    if (!activeTabChatKey) return;

    let newActiveIds = [...activeSkillIds];
    if (newActiveIds.includes(skillId)) {
      newActiveIds = newActiveIds.filter(id => id !== skillId);
    } else {
      newActiveIds.push(skillId);
    }

    setActiveSkillIds(newActiveIds);
    chrome.runtime.sendMessage({
      action: 'SET_ACTIVE_SKILLS',
      chatKey: activeTabChatKey,
      activeSkillIds: newActiveIds
    });
  };

  const handleImportGitHub = async () => {
    if (!githubUrl.trim()) return;
    setImportStatus({ message: 'Fetching file contents...', type: 'info' });

    try {
      chrome.runtime.sendMessage({
        action: 'IMPORT_GITHUB_SKILL',
        url: githubUrl.trim()
      }, (response) => {
        if (response && response.success && response.skill) {
          // Save the skill
          chrome.runtime.sendMessage({
            action: 'SAVE_SKILL',
            skill: response.skill
          }, (saveResponse) => {
            if (saveResponse && saveResponse.success) {
              setSkills(saveResponse.skills);
              setGithubUrl('');
              setImportStatus({ 
                message: `Successfully installed "${response.skill.name}"!`, 
                type: 'success' 
              });
              setTimeout(() => setImportStatus(null), 3000);
            }
          });
        } else {
          setImportStatus({ 
            message: response?.error || 'Failed to parse file from GitHub', 
            type: 'error' 
          });
        }
      });
    } catch (e: any) {
      setImportStatus({ message: e.message || 'Error executing import request', type: 'error' });
    }
  };

  const handleDeleteSkill = (id: string) => {
    if (confirm('Are you sure you want to delete this skill? This cannot be undone.')) {
      chrome.runtime.sendMessage({
        action: 'DELETE_SKILL',
        id
      }, (response) => {
        if (response && response.success) {
          setSkills(response.skills);
          // Update active skill list in case deleted skill was active
          setActiveSkillIds(prev => prev.filter(sId => sId !== id));
        }
      });
    }
  };

  const handleOpenEdit = (skill: Skill) => {
    setEditSkillId(skill.id);
    setEditName(skill.name);
    setEditDesc(skill.description);
    setEditVersion(skill.version || '1.0.0');
    setEditAuthor(skill.author || '');
    setEditIcon(skill.icon || '🧠');
    setEditContent(skill.content);
    setEditInstructions(skill.systemInstructions);
    setActiveTab('import-create');
  };

  const handleSaveSkill = () => {
    if (!editName.trim() || !editContent.trim()) {
      setEditorStatus({ message: 'Name and Markdown Content are required.', type: 'error' });
      return;
    }

    const id = editSkillId || editName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Generate simple instructions if empty
    let instructions = editInstructions.trim();
    if (!instructions) {
      instructions = editContent.slice(0, 200) + (editContent.length > 200 ? '...' : '');
    }

    const updatedSkill: Skill = {
      id,
      name: editName.trim(),
      description: editDesc.trim() || 'Custom user skill.',
      version: editVersion.trim(),
      author: editAuthor.trim() || 'Local User',
      icon: editIcon.trim(),
      content: editContent.trim(),
      systemInstructions: instructions,
      createdAt: Date.now()
    };

    chrome.runtime.sendMessage({
      action: 'SAVE_SKILL',
      skill: updatedSkill
    }, (response) => {
      if (response && response.success) {
        setSkills(response.skills);
        setEditorStatus(null);
        handleClearEditor();
        setActiveTab('manage');
      } else {
        setEditorStatus({ message: 'Failed to save skill in local storage.', type: 'error' });
      }
    });
  };

  const handleClearEditor = () => {
    setEditSkillId(null);
    setEditName('');
    setEditDesc('');
    setEditVersion('1.0.0');
    setEditAuthor('');
    setEditIcon('🧠');
    setEditContent('');
    setEditInstructions('');
    setEditorStatus(null);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        // Parse simple markdown metadata
        const lines = text.split('\n');
        let name = file.name.replace('.md', '').replace(/-/g, ' ');
        // Capitalize words
        name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        let desc = 'Local import';
        let instructions = text.slice(0, 150) + (text.length > 150 ? '...' : '');

        // Search for H1 header to set name
        for (const line of lines) {
          if (line.trim().startsWith('# ')) {
            name = line.trim().slice(2).trim();
            break;
          }
        }

        setEditName(name);
        setEditDesc(desc);
        setEditContent(text);
        setEditInstructions(instructions);
        setEditIcon('📄');
        setImportStatus({ message: 'Loaded markdown file into creator editor!', type: 'success' });
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleOpenOptionsPage = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  };

  const themeVars = theme === 'light' ? {
    '--bg': '#ffffff',
    '--text-primary': '#0f172a',
    '--text-secondary': '#334155',
    '--text-muted': '#64748b',
    '--border': '#cbd5e1',
    '--card-bg': '#f8fafc',
    '--card-border': '#cbd5e1',
    '--card-active-bg': '#e0e7ff',
    '--card-active-border': '#6366f1',
    '--button-secondary-bg': '#f1f5f9',
    '--button-secondary-border': '#cbd5e1',
    '--button-secondary-text': '#334155',
    '--input-bg': '#ffffff',
    '--input-border': '#cbd5e1',
    '--input-text': '#0f172a',
    '--glow': 'none'
  } : {
    '--bg': '#090d16',
    '--text-primary': '#f8fafc',
    '--text-secondary': '#cbd5e1',
    '--text-muted': '#94a3b8',
    '--border': 'rgba(255, 255, 255, 0.05)',
    '--card-bg': 'rgba(255, 255, 255, 0.02)',
    '--card-border': 'rgba(255, 255, 255, 0.06)',
    '--card-active-bg': 'rgba(99, 102, 241, 0.06)',
    '--card-active-border': '#6366f1',
    '--button-secondary-bg': 'rgba(255, 255, 255, 0.04)',
    '--button-secondary-border': 'rgba(255, 255, 255, 0.08)',
    '--button-secondary-text': '#cbd5e1',
    '--input-bg': 'rgba(255, 255, 255, 0.02)',
    '--input-border': 'rgba(255, 255, 255, 0.06)',
    '--input-text': 'white',
    '--glow': 'radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.15) 0%, transparent 70%)'
  };

  return (
    <div style={{ ...containerStyle, ...themeVars } as React.CSSProperties}>
      {/* Background radial-glow */}
      <div style={glowBgStyle} />

      {/* Header */}
      <header style={headerStyle}>
        <div style={logoContainerStyle}>
          <div style={logoBadgeStyle}>
            <Layers size={16} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={logoTitleStyle}>Universal Skills</h1>
            <p style={logoSubtitleStyle}>Portable Claude-style Skills</p>
          </div>
        </div>
        <button onClick={handleOpenOptionsPage} style={optionsBtnStyle} title="Open Management Dashboard">
          <Sliders size={16} />
        </button>
      </header>

      {/* Nav Tabs */}
      <nav style={navStyle}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={activeTab === 'dashboard' ? activeTabBtnStyle : tabBtnStyle}
        >
          <Sparkles size={14} style={{ marginRight: '6px' }} />
          Chat Control
        </button>
        <button 
          onClick={() => setActiveTab('manage')} 
          style={activeTab === 'manage' ? activeTabBtnStyle : tabBtnStyle}
        >
          <BookOpen size={14} style={{ marginRight: '6px' }} />
          My Skills
        </button>
        <button 
          onClick={() => setActiveTab('import-create')} 
          style={activeTab === 'import-create' ? activeTabBtnStyle : tabBtnStyle}
        >
          <Plus size={14} style={{ marginRight: '6px' }} />
          Create / Import
        </button>
      </nav>

      {/* Content Container */}
      <main style={mainStyle}>
        {/* TAB 1: DASHBOARD / CHAT CONTROL */}
        {activeTab === 'dashboard' && (
          <div style={tabContentStyle}>
            {/* Active Platform Banner */}
            <div style={activeTabPlatform ? activeBannerStyle : inactiveBannerStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: activeTabPlatform ? '#10b981' : '#ef4444',
                  boxShadow: activeTabPlatform ? '0 0 8px #10b981' : 'none'
                }} />
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                    Current Chat State
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px', whiteSpace: 'nowrap' }}>
                    {activeTabPlatform ? `${activeTabPlatform.toUpperCase()}: ${activeTabTitle}` : 'No AI Platform Page Active'}
                  </div>
                </div>
              </div>
              {activeTabPlatform && (
                <span style={platformBadgeStyle(activeTabPlatform)}>
                  {activeTabPlatform}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px 0' }}>
              <h3 style={sectionTitleStyle}>Toggle Skills For Current Chat</h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {activeSkillIds.length} enabled
              </span>
            </div>

            {/* Platform active skills toggle */}
            {!activeTabPlatform ? (
              <div style={emptyStateCardStyle}>
                <AlertCircle size={24} color="#64748b" style={{ marginBottom: '8px' }} />
                <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 500 }}>AI Chat Not Detected</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                  Open ChatGPT, Claude, Gemini, DeepSeek, Perplexity, Grok, or Qwen to toggle skills live in your conversation.
                </p>
              </div>
            ) : skills.length === 0 ? (
              <div style={emptyStateCardStyle}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}>No skills installed</p>
                <button onClick={() => setActiveTab('import-create')} style={actionBtnStyle}>
                  Create first skill
                </button>
              </div>
            ) : (
              <div style={skillsGridStyle}>
                {skills.map(skill => {
                  const isActive = activeSkillIds.includes(skill.id);
                  return (
                    <div 
                      key={skill.id} 
                      onClick={() => handleToggleSkill(skill.id)}
                      style={isActive ? activeSkillCardStyle : skillCardStyle}
                    >
                      <div style={cardHeaderStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.25rem' }}>{skill.icon || '🧠'}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{skill.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>v{skill.version || '1.0.0'}</div>
                          </div>
                        </div>
                        <div style={isActive ? activeCheckboxStyle : checkboxStyle}>
                          {isActive && <Check size={10} color="#ffffff" strokeWidth={3} />}
                        </div>
                      </div>
                      <p style={cardDescStyle}>{skill.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANAGE INSTALLED SKILLS */}
        {activeTab === 'manage' && (
          <div style={tabContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px 0' }}>
              <h3 style={sectionTitleStyle}>Installed Skills Library</h3>
              <button 
                onClick={handleClearEditor}
                style={{ ...textLinkBtnStyle, color: '#6366f1' }}
              >
                + Create custom skill
              </button>
            </div>

            {skills.length === 0 ? (
              <div style={emptyStateCardStyle}>
                <BookOpen size={24} color="#64748b" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  No skills installed. Paste standard Markdown or import from GitHub.
                </p>
              </div>
            ) : (
              <div style={manageListStyle}>
                {skills.map(skill => (
                  <div key={skill.id} style={manageCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyItems: 'space-between', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem', marginTop: '2px' }}>{skill.icon || '🧠'}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>
                            {skill.name}
                            <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '6px', fontWeight: 'normal' }}>
                              v{skill.version || '1.0.0'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                            {skill.description}
                          </div>
                          {skill.githubUrl && (
                            <a 
                              href={skill.githubUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', color: '#818cf8', marginTop: '6px', textDecoration: 'none' }}
                            >
                              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                              </svg>
                              View GitHub Source
                              <ExternalLink size={8} />
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => handleOpenEdit(skill)}
                          style={iconBtnStyle} 
                          title="Edit skill details"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSkill(skill.id)}
                          style={{ ...iconBtnStyle, color: '#ef4444' }}
                          title="Delete skill"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IMPORT OR CREATE NEW SKILLS */}
        {activeTab === 'import-create' && (
          <div style={tabContentStyle}>
            {/* Toggle editor / GitHub URL input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* GitHub Import */}
              {!editSkillId && (
                <div style={importBoxStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="#818cf8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>Import from GitHub Repository</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="text" 
                      placeholder="https://github.com/user/repo/blob/main/expert.md"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      style={inputStyle}
                    />
                    <button onClick={handleImportGitHub} style={importSubmitBtnStyle}>
                      Import
                    </button>
                  </div>
                  
                  {/* File Upload Option */}
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Or load a local file:</span>
                    <label style={fileUploadLabelStyle}>
                      <input 
                        type="file" 
                        accept=".md" 
                        onChange={handleImportFile}
                        style={{ display: 'none' }}
                      />
                      <FileText size={10} style={{ marginRight: '4px' }} />
                      Choose Markdown (.md)
                    </label>
                  </div>

                  {importStatus && (
                    <div style={importStatusBannerStyle(importStatus.type)}>
                      <Info size={12} style={{ marginRight: '6px', flexShrink: 0 }} />
                      <span>{importStatus.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Creator Editor Form */}
              <div style={editorBoxStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="#10b981" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                      {editSkillId ? 'Edit Skill Prompt' : 'Create Custom Skill'}
                    </span>
                  </div>
                  {editSkillId && (
                    <button onClick={handleClearEditor} style={textLinkBtnStyle}>
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Skill Icon (Emoji)" 
                    value={editIcon}
                    onChange={(e) => setEditIcon(e.target.value)}
                    style={{ ...inputStyle, width: '60px', textAlign: 'center' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Skill Name (e.g. Python Expert)" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Brief description" 
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input 
                    type="text" 
                    placeholder="v1.0.0" 
                    value={editVersion}
                    onChange={(e) => setEditVersion(e.target.value)}
                    style={{ ...inputStyle, width: '70px' }}
                  />
                </div>

                <textarea 
                  placeholder="Paste or write the entire Markdown (.md) rules/instructions here. Include headings, lists, guidelines etc."
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  style={textareaStyle}
                />

                <textarea 
                  placeholder="Optional: Enter a short text reminder for lightweight refreshes (e.g., 'Ensure all code is PEP 8 Python 3.11+')"
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  rows={2}
                  style={{ ...textareaStyle, marginTop: '8px' }}
                />

                {editorStatus && (
                  <div style={editorStatusBannerStyle(editorStatus.type)}>
                    <span>{editorStatus.message}</span>
                  </div>
                )}

                <button onClick={handleSaveSkill} style={saveBtnStyle}>
                  <Save size={14} style={{ marginRight: '6px' }} />
                  {editSkillId ? 'Save Changes' : 'Save New Skill'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// -------------------------------------------------------------
// Pure Inline Styling Styles
// -------------------------------------------------------------
const containerStyle: React.CSSProperties = {
  width: '450px',
  height: '580px',
  backgroundColor: 'var(--bg)',
  color: 'var(--text-primary)',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

const glowBgStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-150px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '350px',
  height: '250px',
  borderRadius: '50%',
  background: 'var(--glow)',
  pointerEvents: 'none',
  zIndex: 0,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  borderBottom: '1px solid var(--border)',
  zIndex: 1,
};

const logoContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const logoBadgeStyle: React.CSSProperties = {
  width: '34px',
  height: '34px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
};

const logoTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const logoSubtitleStyle: React.CSSProperties = {
  margin: '2px 0 0 0',
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
};

const optionsBtnStyle: React.CSSProperties = {
  background: 'var(--button-secondary-bg)',
  border: '1px solid var(--button-secondary-border)',
  color: 'var(--button-secondary-text)',
  width: '34px',
  height: '34px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const navStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  padding: '4px 16px',
  backgroundColor: 'var(--bg-sidebar)',
  borderBottom: '1px solid var(--border)',
  zIndex: 1,
};

const tabBtnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  padding: '10px 4px',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
};

const activeTabBtnStyle: React.CSSProperties = {
  ...tabBtnStyle,
  color: '#6366f1',
  borderBottom: '2px solid #6366f1',
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  padding: '16px 20px',
  overflowY: 'auto',
  zIndex: 1,
  boxSizing: 'border-box',
};

const tabContentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
};

const activeBannerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(16, 185, 129, 0.08)',
  border: '1px solid rgba(16, 185, 129, 0.15)',
  borderRadius: '10px',
  padding: '12px 14px',
};

const inactiveBannerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(239, 68, 68, 0.08)',
  border: '1px solid rgba(239, 68, 68, 0.15)',
  borderRadius: '10px',
  padding: '12px 14px',
};

const platformBadgeStyle = (platform: string): React.CSSProperties => {
  let bg = '#10b981';
  if (platform === 'claude') bg = '#f97316';
  if (platform === 'gemini') bg = '#3b82f6';
  if (platform === 'perplexity') bg = '#06b6d4';
  if (platform === 'grok') bg = '#8b5cf6';
  if (platform === 'deepseek') bg = '#10b981';
  if (platform === 'qwen') bg = '#4f46e5';

  return {
    backgroundColor: `${bg}20`,
    border: `1px solid ${bg}40`,
    color: bg,
    padding: '3px 10px',
    borderRadius: '8px',
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
  };
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  fontWeight: 600,
};

const emptyStateCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '12px',
  padding: '28px 20px',
  textAlign: 'center',
  color: 'var(--text-muted)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '12px 0',
};

const actionBtnStyle: React.CSSProperties = {
  backgroundColor: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '10px',
  transition: 'all 0.2s ease',
};

const skillsGridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  paddingBottom: '20px',
};

const skillCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '12px',
  padding: '16px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  color: 'var(--text-primary)'
};

const activeSkillCardStyle: React.CSSProperties = {
  ...skillCardStyle,
  backgroundColor: 'var(--card-active-bg)',
  borderColor: 'var(--card-active-border)',
  boxShadow: 'var(--active-glow)',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
};

const checkboxStyle: React.CSSProperties = {
  width: '18px',
  height: '18px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
};

const activeCheckboxStyle: React.CSSProperties = {
  ...checkboxStyle,
  backgroundColor: '#6366f1',
  borderColor: '#6366f1',
};

const cardDescStyle: React.CSSProperties = {
  margin: '10px 0 0 0',
  fontSize: '0.8rem',
  color: 'var(--text-muted)',
  lineHeight: '1.45',
};

const manageListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  paddingBottom: '20px',
};

const manageCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  alignItems: 'center',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'var(--button-secondary-bg)',
  border: '1px solid var(--button-secondary-border)',
  color: 'var(--text-muted)',
  width: '28px',
  height: '28px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const textLinkBtnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '0.8rem',
  cursor: 'pointer',
  padding: 0,
  fontWeight: 600,
};

const importBoxStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '12px',
  padding: '16px',
};

const editorBoxStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '0.85rem',
  color: 'var(--input-text)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.2s ease',
};

const importSubmitBtnStyle: React.CSSProperties = {
  backgroundColor: '#6366f1',
  border: 'none',
  color: 'white',
  borderRadius: '8px',
  padding: '10px 18px',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const fileUploadLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#818cf8',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  background: 'rgba(99, 102, 241, 0.08)',
  border: '1px solid rgba(99, 102, 241, 0.15)',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
};

const textareaStyle: React.CSSProperties = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '0.85rem',
  color: 'var(--input-text)',
  outline: 'none',
  resize: 'none',
  fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
  boxSizing: 'border-box',
  transition: 'all 0.2s ease',
};

const saveBtnStyle: React.CSSProperties = {
  backgroundColor: '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 18px',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
};

const importStatusBannerStyle = (type: 'success' | 'error' | 'info'): React.CSSProperties => {
  let bg = '#3b82f612';
  let border = '#3b82f630';
  let color = '#60a5fa';
  
  if (type === 'success') {
    bg = '#10b98112';
    border = '#10b98130';
    color = '#34d399';
  } else if (type === 'error') {
    bg = '#ef444412';
    border = '#ef444430';
    color = '#f87171';
  }

  return {
    backgroundColor: bg,
    border: `1px solid ${border}`,
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '0.75rem',
    color,
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
  };
};

const editorStatusBannerStyle = (type: 'success' | 'error'): React.CSSProperties => {
  return importStatusBannerStyle(type);
};
