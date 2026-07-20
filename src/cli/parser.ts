import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';

export interface CliSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  content: string;
  githubUrl?: string;
}

export interface WorkspaceConfig {
  project: string;
  skills: string[];
  targets: {
    claudemd?: { enabled: boolean; output: string; includeHeader?: boolean };
    cursorrules?: { enabled: boolean; output: string };
    copilot?: { enabled: boolean; output: string };
  };
  autoUpdate?: {
    enabled: boolean;
    interval: string;
  };
}

export function getGlobalLibraryDir(): string {
  const dir = path.join(os.homedir(), '.universal-skills', 'library');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function parseFrontmatter(markdownText: string, fallbackId: string): CliSkill {
  const lines = markdownText.split(/\r?\n/);
  let name = '';
  let description = '';
  let version = '1.0.0';
  let author = 'CLI Import';
  let icon = '🧠';
  let githubUrl = '';

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
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          const key = line.slice(0, colonIndex).trim().toLowerCase();
          const val = line.slice(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
          if (key === 'name' || key === 'title') name = val;
          else if (key === 'description') description = val;
          else if (key === 'version') version = val;
          else if (key === 'author') author = val;
          else if (key === 'icon') icon = val;
          else if (key === 'githuburl') githubUrl = val;
        }
      }
      contentStartIndex = yamlEndIdx + 1;
    }
  }

  // Fallback H1 search
  if (!name) {
    for (let i = contentStartIndex; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('# ')) {
        name = trimmed.slice(2).trim();
        break;
      }
    }
  }

  if (!name) {
    name = fallbackId.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  if (!description) {
    const remainingText = lines.slice(contentStartIndex).join('\n');
    const paras = remainingText.split('\n\n').map(p => p.trim()).filter(p => p && !p.startsWith('#'));
    description = paras[0] ? paras[0].slice(0, 150) + (paras[0].length > 150 ? '...' : '') : 'A custom imported skill.';
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return {
    id,
    name,
    description,
    version,
    author,
    icon,
    content: markdownText,
    githubUrl: githubUrl || undefined
  };
}

export function resolveRawGithubUrl(urlStr: string): string {
  if (urlStr.includes('github.com') && !urlStr.includes('raw.githubusercontent.com')) {
    try {
      const parsedUrl = new URL(urlStr);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 4 && pathParts[2] === 'blob') {
        const username = pathParts[0];
        const repo = pathParts[1];
        const branch = pathParts[3];
        const remainingPath = pathParts.slice(4).join('/');
        return `https://raw.githubusercontent.com/${username}/${repo}/${branch}/${remainingPath}`;
      }
    } catch {
      // Return original if parsing fails
    }
  }
  return urlStr;
}

export function fetchHttp(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Handle redirect
        fetchHttp(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch from ${url}. Status: ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
}

export async function fetchAndInstallSkill(url: string): Promise<CliSkill> {
  const rawUrl = resolveRawGithubUrl(url);
  const markdown = await fetchHttp(rawUrl);
  
  // Extract filename as fallback ID
  const urlParts = url.split('/');
  const filename = urlParts[urlParts.length - 1].replace('.md', '');
  
  const skill = parseFrontmatter(markdown, filename);
  if (url.includes('github.com')) {
    skill.githubUrl = url;
  }

  const globalDir = getGlobalLibraryDir();
  const filePath = path.join(globalDir, `${skill.id}.md`);
  fs.writeFileSync(filePath, markdown, 'utf8');

  return skill;
}

export function loadGlobalSkills(): CliSkill[] {
  const dir = getGlobalLibraryDir();
  const files = fs.readdirSync(dir);
  const skills: CliSkill[] = [];

  for (const file of files) {
    if (file.endsWith('.md')) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const fallbackId = file.replace('.md', '');
      try {
        const skill = parseFrontmatter(content, fallbackId);
        skills.push(skill);
      } catch {
        // Skip unparseable files
      }
    }
  }

  return skills;
}

export function readWorkspaceConfig(): WorkspaceConfig | null {
  const configPath = path.join(process.cwd(), 'universal-skills.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) as WorkspaceConfig;
  } catch {
    return null;
  }
}

export function writeWorkspaceConfig(config: WorkspaceConfig): void {
  const configPath = path.join(process.cwd(), 'universal-skills.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}
