#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { 
  CliSkill, 
  WorkspaceConfig, 
  getGlobalLibraryDir, 
  loadGlobalSkills, 
  readWorkspaceConfig, 
  writeWorkspaceConfig,
  fetchAndInstallSkill,
  fetchHttp,
  resolveRawGithubUrl,
  parseFrontmatter
} from './parser';
import { compileSkills } from './compiler';

const HELP_TEXT = `
\x1b[1mUniversal Skills CLI (uskills) — Modular prompt & ruleset aligner\x1b[0m

\x1b[36mUsage:\x1b[0m
  uskills <command> [args]

\x1b[36mCommands:\x1b[0m
  \x1b[32minit\x1b[0m                   Initialize a new universal-skills.json configuration in the current directory.
  \x1b[32mlist\x1b[0m                   List all skills stored globally in your local library.
  \x1b[32madd <skill-id>\x1b[0m         Add a skill to the active workspace project config.
  \x1b[32mremove <skill-id>\x1b[0m      Remove a skill from the active workspace project config.
  \x1b[32minstall <github-url>\x1b[0m   Download and install a raw markdown skill from GitHub to your global library.
  \x1b[32mcompile\x1b[0m                Combine active project skills and compile them to IDE target rulesets.
  \x1b[32mupdate\x1b[0m                 Pull fresh updates for any GitHub-linked skills and re-compile targets.

\x1b[36mOptions:\x1b[0m
  --help, -h             Show this help information.
`;

function seedDefaultSkillsIfEmpty() {
  const globalDir = getGlobalLibraryDir();
  const files = fs.readdirSync(globalDir);
  const markdownFiles = files.filter(f => f.endsWith('.md'));
  
  if (markdownFiles.length === 0) {
    const defaults = [
      {
        id: 'python-expert',
        name: 'Python Expert',
        description: 'Enforces clean, modern, type-hinted Python 3.11+ code with docstrings, PEP 8 compliance, and robust error handling.',
        content: `---\nname: "Python Expert"\ndescription: "Enforces clean, modern, type-hinted Python 3.11+ code with docstrings, PEP 8 compliance, and robust error handling."\nversion: "1.0.0"\nauthor: "Universal Skills"\nicon: "🐍"\n---\n\n# Python Expert Skill\n\nApply the following rules to all Python code you write:\n1. Use modern Python (3.11+) features and type hints for all parameters and return values.\n2. Include descriptive Google-style docstrings for all classes and functions.\n3. Write robust error handling with custom exceptions where appropriate.\n4. Avoid raw loops; prefer list comprehensions, generators, and standard library functional tools.\n5. Follow PEP 8 style guidelines strictly.`
      },
      {
        id: 'creative-writer',
        name: 'Creative Writer',
        description: 'Steers the AI away from clichés, corporate jargon, and repetitive structures, promoting vivid imagery and engaging hooks.',
        content: `---\nname: "Creative Writer"\ndescription: "Steers the AI away from clichés, corporate jargon, and repetitive structures, promoting vivid imagery and engaging hooks."\nversion: "1.0.0"\nauthor: "Universal Skills"\nicon: "✍️"\n---\n\n# Creative Writer Skill\n\nWhen writing prose or creative text, follow these rules:\n1. Eliminate corporate jargon, fluff, and robotic transitions (e.g. "In conclusion", "It is important to remember").\n2. Show, don't tell. Focus on vivid sensory details and imagery.\n3. Use active voice and vary sentence structure to create rhythmic flow.\n4. Write strong, arresting opening hooks and clean, resonant endings.\n5. Avoid common AI clichés (e.g. "tapestry", "beacon", "testament to", "delve").`
      },
      {
        id: 'ui-ux-critic',
        name: 'UI/UX Design Critic',
        description: 'Analyzes interfaces for usability, visual balance, accessibility (WCAG), and modern aesthetic principles.',
        content: `---\nname: "UI/UX Design Critic"\ndescription: "Analyzes interfaces for usability, visual balance, accessibility (WCAG), and modern aesthetic principles."\nversion: "1.1.0"\nauthor: "Universal Skills"\nicon: "🎨"\n---\n\n# UI/UX Design Critic Skill\n\nYou are an elite UI/UX critic. For any UI code, mockup, or description:\n1. Evaluate visual hierarchy, typography contrast, and vertical grid alignment.\n2. Review responsiveness and ease of interaction.\n3. Ensure WCAG 2.1 AA accessibility guidelines are met (color contrast, keyboard focus, screen reader tags).\n4. Highlight micro-interactions or layout details that make the interface feel premium.\n5. Provide actionable feedback with before/after recommendations.`
      }
    ];

    for (const skill of defaults) {
      fs.writeFileSync(path.join(globalDir, `${skill.id}.md`), skill.content, 'utf8');
    }
    console.log('\x1b[32mSeeded default skills (Python Expert, Creative Writer, UI/UX Design Critic) in global library.\x1b[0m');
  }
}

async function main() {
  seedDefaultSkillsIfEmpty();

  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(HELP_TEXT);
    return;
  }

  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'init': {
      const config = readWorkspaceConfig();
      if (config) {
        console.log('\x1b[33muniversal-skills.json already exists in this directory.\x1b[0m');
        return;
      }
      const dirName = path.basename(process.cwd());
      const newConfig: WorkspaceConfig = {
        project: dirName,
        skills: [],
        targets: {
          claudemd: { enabled: true, output: 'CLAUDE.md', includeHeader: true },
          cursorrules: { enabled: true, output: '.cursorrules' }
        },
        autoUpdate: {
          enabled: true,
          interval: 'daily'
        }
      };
      writeWorkspaceConfig(newConfig);
      console.log('\x1b[32mInitialized universal-skills.json config successfully!\x1b[0m');
      break;
    }

    case 'list': {
      const skills = loadGlobalSkills();
      console.log(`\x1b[1mGlobal Library Directory:\x1b[0m \x1b[34m${getGlobalLibraryDir()}\x1b[0m\n`);
      console.log(`\x1b[1mAvailable Skills:\x1b[0m`);
      if (skills.length === 0) {
        console.log('  No skills installed. Run `uskills install <github-url>` to add one.');
        return;
      }
      for (const skill of skills) {
        const syncText = skill.githubUrl ? `\x1b[32m[Synced: ${skill.githubUrl}]\x1b[0m` : `\x1b[33m[Local]\x1b[0m`;
        console.log(`  * \x1b[36m${skill.id}\x1b[0m - ${skill.icon} ${skill.name} (v${skill.version}) ${syncText}`);
        console.log(`    \x1b[90m${skill.description}\x1b[0m`);
      }
      break;
    }

    case 'add': {
      if (args.length < 2) {
        console.log('\x1b[31mError: Please specify a skill-id to add.\x1b[0m (e.g. `uskills add python-expert`)');
        return;
      }
      const skillId = args[1].toLowerCase();
      const config = readWorkspaceConfig();
      if (!config) {
        console.log('\x1b[31mError: Active workspace config not found. Run `uskills init` first.\x1b[0m');
        return;
      }
      const skills = loadGlobalSkills();
      if (!skills.some(s => s.id === skillId)) {
        console.log(`\x1b[31mError: Skill "${skillId}" not found in global library.\x1b[0m Run \x1b[33muskills list\x1b[0m to see available skills.`);
        return;
      }
      if (config.skills.includes(skillId)) {
        console.log(`\x1b[33mSkill "${skillId}" is already active in this project.\x1b[0m`);
        return;
      }
      config.skills.push(skillId);
      writeWorkspaceConfig(config);
      console.log(`\x1b[32mAdded skill "${skillId}" to workspace config. Run \x1b[33muskills compile\x1b[0m to apply.\x1b[0m`);
      break;
    }

    case 'remove': {
      if (args.length < 2) {
        console.log('\x1b[31mError: Please specify a skill-id to remove.\x1b[0m');
        return;
      }
      const skillId = args[1].toLowerCase();
      const config = readWorkspaceConfig();
      if (!config) {
        console.log('\x1b[31mError: Active workspace config not found. Run `uskills init` first.\x1b[0m');
        return;
      }
      if (!config.skills.includes(skillId)) {
        console.log(`\x1b[33mSkill "${skillId}" is not active in this project.\x1b[0m`);
        return;
      }
      config.skills = config.skills.filter(id => id !== skillId);
      writeWorkspaceConfig(config);
      console.log(`\x1b[32mRemoved skill "${skillId}" from workspace config. Run \x1b[33muskills compile\x1b[0m to apply.\x1b[0m`);
      break;
    }

    case 'install': {
      if (args.length < 2) {
        console.log('\x1b[31mError: Please specify a GitHub repository URL or raw markdown URL.\x1b[0m');
        return;
      }
      const url = args[1];
      console.log(`Fetching and installing skill from: ${url}...`);
      try {
        const skill = await fetchAndInstallSkill(url);
        console.log(`\x1b[32mSuccessfully installed skill "${skill.id}" (${skill.name} v${skill.version}) to global library!\x1b[0m`);
      } catch (err: any) {
        console.log(`\x1b[31mError installing skill: ${err.message}\x1b[0m`);
      }
      break;
    }

    case 'compile': {
      const config = readWorkspaceConfig();
      if (!config) {
        console.log('\x1b[31mError: Active workspace config not found. Run `uskills init` first.\x1b[0m');
        return;
      }
      const globalSkills = loadGlobalSkills();
      compileSkills(globalSkills, config);
      break;
    }

    case 'update': {
      const config = readWorkspaceConfig();
      const globalSkills = loadGlobalSkills();
      console.log('Checking for updates for GitHub-linked skills...');
      let updatedCount = 0;
      for (const skill of globalSkills) {
        if (skill.githubUrl) {
          console.log(`Checking update for skill "${skill.id}" from ${skill.githubUrl}...`);
          try {
            const rawUrl = resolveRawGithubUrl(skill.githubUrl);
            const markdown = await fetchHttp(rawUrl);
            const globalDir = getGlobalLibraryDir();
            const filePath = path.join(globalDir, `${skill.id}.md`);
            fs.writeFileSync(filePath, markdown, 'utf8');
            updatedCount++;
            console.log(`\x1b[32mUpdated "${skill.id}"\x1b[0m`);
          } catch (err: any) {
            console.log(`\x1b[31mFailed to update "${skill.id}": ${err.message}\x1b[0m`);
          }
        }
      }
      console.log(`Update check completed. ${updatedCount} skill(s) updated.`);
      if (config) {
        console.log('Re-compiling active workspace targets...');
        const freshGlobalSkills = loadGlobalSkills();
        compileSkills(freshGlobalSkills, config);
      }
      break;
    }

    default: {
      console.log(`\x1b[31mUnknown command: ${command}\x1b[0m`);
      console.log(HELP_TEXT);
      break;
    }
  }
}

main().catch(err => {
  console.error('\x1b[31mCLI execution failed:\x1b[0m', err);
});
