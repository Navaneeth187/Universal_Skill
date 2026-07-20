#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli/index.ts
var fs3 = __toESM(require("fs"), 1);
var path3 = __toESM(require("path"), 1);

// src/cli/parser.ts
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);
var os = __toESM(require("os"), 1);
var https = __toESM(require("https"), 1);
function getGlobalLibraryDir() {
  const dir = path.join(os.homedir(), ".universal-skills", "library");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
function parseFrontmatter(markdownText, fallbackId) {
  const lines = markdownText.split(/\r?\n/);
  let name = "";
  let description = "";
  let version = "1.0.0";
  let author = "CLI Import";
  let icon = "\u{1F9E0}";
  let githubUrl = "";
  let contentStartIndex = 0;
  if (lines[0]?.trim() === "---") {
    let yamlEndIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        yamlEndIdx = i;
        break;
      }
    }
    if (yamlEndIdx > -1) {
      for (let i = 1; i < yamlEndIdx; i++) {
        const line = lines[i];
        const colonIndex = line.indexOf(":");
        if (colonIndex > -1) {
          const key = line.slice(0, colonIndex).trim().toLowerCase();
          const val = line.slice(colonIndex + 1).trim().replace(/^['"]|['"]$/g, "");
          if (key === "name" || key === "title") name = val;
          else if (key === "description") description = val;
          else if (key === "version") version = val;
          else if (key === "author") author = val;
          else if (key === "icon") icon = val;
          else if (key === "githuburl") githubUrl = val;
        }
      }
      contentStartIndex = yamlEndIdx + 1;
    }
  }
  if (!name) {
    for (let i = contentStartIndex; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith("# ")) {
        name = trimmed.slice(2).trim();
        break;
      }
    }
  }
  if (!name) {
    name = fallbackId.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }
  if (!description) {
    const remainingText = lines.slice(contentStartIndex).join("\n");
    const paras = remainingText.split("\n\n").map((p) => p.trim()).filter((p) => p && !p.startsWith("#"));
    description = paras[0] ? paras[0].slice(0, 150) + (paras[0].length > 150 ? "..." : "") : "A custom imported skill.";
  }
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return {
    id,
    name,
    description,
    version,
    author,
    icon,
    content: markdownText,
    githubUrl: githubUrl || void 0
  };
}
function resolveRawGithubUrl(urlStr) {
  if (urlStr.includes("github.com") && !urlStr.includes("raw.githubusercontent.com")) {
    try {
      const parsedUrl = new URL(urlStr);
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 4 && pathParts[2] === "blob") {
        const username = pathParts[0];
        const repo = pathParts[1];
        const branch = pathParts[3];
        const remainingPath = pathParts.slice(4).join("/");
        return `https://raw.githubusercontent.com/${username}/${repo}/${branch}/${remainingPath}`;
      }
    } catch {
    }
  }
  return urlStr;
}
function fetchHttp(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchHttp(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch from ${url}. Status: ${res.statusCode}`));
        return;
      }
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => resolve(data));
    }).on("error", (err) => reject(err));
  });
}
async function fetchAndInstallSkill(url) {
  const rawUrl = resolveRawGithubUrl(url);
  const markdown = await fetchHttp(rawUrl);
  const urlParts = url.split("/");
  const filename = urlParts[urlParts.length - 1].replace(".md", "");
  const skill = parseFrontmatter(markdown, filename);
  if (url.includes("github.com")) {
    skill.githubUrl = url;
  }
  const globalDir = getGlobalLibraryDir();
  const filePath = path.join(globalDir, `${skill.id}.md`);
  fs.writeFileSync(filePath, markdown, "utf8");
  return skill;
}
function loadGlobalSkills() {
  const dir = getGlobalLibraryDir();
  const files = fs.readdirSync(dir);
  const skills = [];
  for (const file of files) {
    if (file.endsWith(".md")) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, "utf8");
      const fallbackId = file.replace(".md", "");
      try {
        const skill = parseFrontmatter(content, fallbackId);
        skills.push(skill);
      } catch {
      }
    }
  }
  return skills;
}
function readWorkspaceConfig() {
  const configPath = path.join(process.cwd(), "universal-skills.json");
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return null;
  }
}
function writeWorkspaceConfig(config) {
  const configPath = path.join(process.cwd(), "universal-skills.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
}

// src/cli/compiler.ts
var fs2 = __toESM(require("fs"), 1);
var path2 = __toESM(require("path"), 1);
var BLOCK_START = "# === UNIVERSAL SKILLS AUTO-GENERATED BLOCK (DO NOT EDIT) ===";
var BLOCK_END = "# === END OF UNIVERSAL SKILLS BLOCK ===";
function compileSkills(globalSkills, config) {
  const activeSkills = globalSkills.filter((s) => config.skills.includes(s.id));
  if (activeSkills.length === 0) {
    console.log("\x1B[33mNo active skills configured in workspace config.\x1B[0m");
  }
  let compiledPayload = "";
  for (const skill of activeSkills) {
    compiledPayload += `
======================================================================
`;
    compiledPayload += `[UNIVERSAL SKILL ACTIVE: ${skill.name} (v${skill.version})]
`;
    compiledPayload += `Description: ${skill.description}
`;
    if (skill.author) compiledPayload += `Author: ${skill.author}
`;
    compiledPayload += `----------------------------------------------------------------------
`;
    compiledPayload += `${skill.content.replace(/^---[\s\S]*?---/, "").trim()}
`;
    compiledPayload += `======================================================================
`;
  }
  const targets = config.targets;
  if (targets.claudemd?.enabled) {
    updateTargetFile(
      path2.join(process.cwd(), targets.claudemd.output),
      compiledPayload,
      targets.claudemd.includeHeader ? getClaudeMdHeader(config.project) : ""
    );
  }
  if (targets.cursorrules?.enabled) {
    updateTargetFile(
      path2.join(process.cwd(), targets.cursorrules.output),
      compiledPayload,
      ""
    );
  }
  if (targets.copilot?.enabled) {
    const outputPath = path2.join(process.cwd(), targets.copilot.output);
    const parentDir = path2.dirname(outputPath);
    if (!fs2.existsSync(parentDir)) {
      fs2.mkdirSync(parentDir, { recursive: true });
    }
    updateTargetFile(outputPath, compiledPayload, "");
  }
}
function updateTargetFile(filePath, compiledPayload, header) {
  let existingContent = "";
  if (fs2.existsSync(filePath)) {
    existingContent = fs2.readFileSync(filePath, "utf8");
  }
  const generatedBlock = `${BLOCK_START}
${compiledPayload.trim()}
${BLOCK_END}`;
  let newContent = "";
  const startIdx = existingContent.indexOf(BLOCK_START);
  const endIdx = existingContent.indexOf(BLOCK_END);
  if (startIdx > -1 && endIdx > -1 && endIdx > startIdx) {
    newContent = existingContent.slice(0, startIdx).trim() + "\n\n" + generatedBlock + "\n\n" + existingContent.slice(endIdx + BLOCK_END.length).trim();
  } else {
    if (existingContent.trim()) {
      newContent = existingContent.trim() + "\n\n" + generatedBlock;
    } else {
      newContent = (header ? header.trim() + "\n\n" : "") + generatedBlock;
    }
  }
  fs2.writeFileSync(filePath, newContent.trim() + "\n", "utf8");
  console.log(`\x1B[32mSuccessfully compiled target: ${path2.basename(filePath)}\x1B[0m`);
}
function getClaudeMdHeader(projectName) {
  return `# CLAUDE.md Rules for ${projectName}

This file contains instructions, commands, and active prompt alignment configurations.`;
}

// src/cli/index.ts
var HELP_TEXT = `
\x1B[1mUniversal Skills CLI (uskills) \u2014 Modular prompt & ruleset aligner\x1B[0m

\x1B[36mUsage:\x1B[0m
  uskills <command> [args]

\x1B[36mCommands:\x1B[0m
  \x1B[32minit\x1B[0m                   Initialize a new universal-skills.json configuration in the current directory.
  \x1B[32mlist\x1B[0m                   List all skills stored globally in your local library.
  \x1B[32madd <skill-id>\x1B[0m         Add a skill to the active workspace project config.
  \x1B[32mremove <skill-id>\x1B[0m      Remove a skill from the active workspace project config.
  \x1B[32minstall <github-url>\x1B[0m   Download and install a raw markdown skill from GitHub to your global library.
  \x1B[32mcompile\x1B[0m                Combine active project skills and compile them to IDE target rulesets.
  \x1B[32mupdate\x1B[0m                 Pull fresh updates for any GitHub-linked skills and re-compile targets.

\x1B[36mOptions:\x1B[0m
  --help, -h             Show this help information.
`;
function seedDefaultSkillsIfEmpty() {
  const globalDir = getGlobalLibraryDir();
  const files = fs3.readdirSync(globalDir);
  const markdownFiles = files.filter((f) => f.endsWith(".md"));
  if (markdownFiles.length === 0) {
    const defaults = [
      {
        id: "python-expert",
        name: "Python Expert",
        description: "Enforces clean, modern, type-hinted Python 3.11+ code with docstrings, PEP 8 compliance, and robust error handling.",
        content: `---
name: "Python Expert"
description: "Enforces clean, modern, type-hinted Python 3.11+ code with docstrings, PEP 8 compliance, and robust error handling."
version: "1.0.0"
author: "Universal Skills"
icon: "\u{1F40D}"
---

# Python Expert Skill

Apply the following rules to all Python code you write:
1. Use modern Python (3.11+) features and type hints for all parameters and return values.
2. Include descriptive Google-style docstrings for all classes and functions.
3. Write robust error handling with custom exceptions where appropriate.
4. Avoid raw loops; prefer list comprehensions, generators, and standard library functional tools.
5. Follow PEP 8 style guidelines strictly.`
      },
      {
        id: "creative-writer",
        name: "Creative Writer",
        description: "Steers the AI away from clich\xE9s, corporate jargon, and repetitive structures, promoting vivid imagery and engaging hooks.",
        content: `---
name: "Creative Writer"
description: "Steers the AI away from clich\xE9s, corporate jargon, and repetitive structures, promoting vivid imagery and engaging hooks."
version: "1.0.0"
author: "Universal Skills"
icon: "\u270D\uFE0F"
---

# Creative Writer Skill

When writing prose or creative text, follow these rules:
1. Eliminate corporate jargon, fluff, and robotic transitions (e.g. "In conclusion", "It is important to remember").
2. Show, don't tell. Focus on vivid sensory details and imagery.
3. Use active voice and vary sentence structure to create rhythmic flow.
4. Write strong, arresting opening hooks and clean, resonant endings.
5. Avoid common AI clich\xE9s (e.g. "tapestry", "beacon", "testament to", "delve").`
      },
      {
        id: "ui-ux-critic",
        name: "UI/UX Design Critic",
        description: "Analyzes interfaces for usability, visual balance, accessibility (WCAG), and modern aesthetic principles.",
        content: `---
name: "UI/UX Design Critic"
description: "Analyzes interfaces for usability, visual balance, accessibility (WCAG), and modern aesthetic principles."
version: "1.1.0"
author: "Universal Skills"
icon: "\u{1F3A8}"
---

# UI/UX Design Critic Skill

You are an elite UI/UX critic. For any UI code, mockup, or description:
1. Evaluate visual hierarchy, typography contrast, and vertical grid alignment.
2. Review responsiveness and ease of interaction.
3. Ensure WCAG 2.1 AA accessibility guidelines are met (color contrast, keyboard focus, screen reader tags).
4. Highlight micro-interactions or layout details that make the interface feel premium.
5. Provide actionable feedback with before/after recommendations.`
      }
    ];
    for (const skill of defaults) {
      fs3.writeFileSync(path3.join(globalDir, `${skill.id}.md`), skill.content, "utf8");
    }
    console.log("\x1B[32mSeeded default skills (Python Expert, Creative Writer, UI/UX Design Critic) in global library.\x1B[0m");
  }
}
async function main() {
  seedDefaultSkillsIfEmpty();
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP_TEXT);
    return;
  }
  const command = args[0].toLowerCase();
  switch (command) {
    case "init": {
      const config = readWorkspaceConfig();
      if (config) {
        console.log("\x1B[33muniversal-skills.json already exists in this directory.\x1B[0m");
        return;
      }
      const dirName = path3.basename(process.cwd());
      const newConfig = {
        project: dirName,
        skills: [],
        targets: {
          claudemd: { enabled: true, output: "CLAUDE.md", includeHeader: true },
          cursorrules: { enabled: true, output: ".cursorrules" }
        },
        autoUpdate: {
          enabled: true,
          interval: "daily"
        }
      };
      writeWorkspaceConfig(newConfig);
      console.log("\x1B[32mInitialized universal-skills.json config successfully!\x1B[0m");
      break;
    }
    case "list": {
      const skills = loadGlobalSkills();
      console.log(`\x1B[1mGlobal Library Directory:\x1B[0m \x1B[34m${getGlobalLibraryDir()}\x1B[0m
`);
      console.log(`\x1B[1mAvailable Skills:\x1B[0m`);
      if (skills.length === 0) {
        console.log("  No skills installed. Run `uskills install <github-url>` to add one.");
        return;
      }
      for (const skill of skills) {
        const syncText = skill.githubUrl ? `\x1B[32m[Synced: ${skill.githubUrl}]\x1B[0m` : `\x1B[33m[Local]\x1B[0m`;
        console.log(`  * \x1B[36m${skill.id}\x1B[0m - ${skill.icon} ${skill.name} (v${skill.version}) ${syncText}`);
        console.log(`    \x1B[90m${skill.description}\x1B[0m`);
      }
      break;
    }
    case "add": {
      if (args.length < 2) {
        console.log("\x1B[31mError: Please specify a skill-id to add.\x1B[0m (e.g. `uskills add python-expert`)");
        return;
      }
      const skillId = args[1].toLowerCase();
      const config = readWorkspaceConfig();
      if (!config) {
        console.log("\x1B[31mError: Active workspace config not found. Run `uskills init` first.\x1B[0m");
        return;
      }
      const skills = loadGlobalSkills();
      if (!skills.some((s) => s.id === skillId)) {
        console.log(`\x1B[31mError: Skill "${skillId}" not found in global library.\x1B[0m Run \x1B[33muskills list\x1B[0m to see available skills.`);
        return;
      }
      if (config.skills.includes(skillId)) {
        console.log(`\x1B[33mSkill "${skillId}" is already active in this project.\x1B[0m`);
        return;
      }
      config.skills.push(skillId);
      writeWorkspaceConfig(config);
      console.log(`\x1B[32mAdded skill "${skillId}" to workspace config. Run \x1B[33muskills compile\x1B[0m to apply.\x1B[0m`);
      break;
    }
    case "remove": {
      if (args.length < 2) {
        console.log("\x1B[31mError: Please specify a skill-id to remove.\x1B[0m");
        return;
      }
      const skillId = args[1].toLowerCase();
      const config = readWorkspaceConfig();
      if (!config) {
        console.log("\x1B[31mError: Active workspace config not found. Run `uskills init` first.\x1B[0m");
        return;
      }
      if (!config.skills.includes(skillId)) {
        console.log(`\x1B[33mSkill "${skillId}" is not active in this project.\x1B[0m`);
        return;
      }
      config.skills = config.skills.filter((id) => id !== skillId);
      writeWorkspaceConfig(config);
      console.log(`\x1B[32mRemoved skill "${skillId}" from workspace config. Run \x1B[33muskills compile\x1B[0m to apply.\x1B[0m`);
      break;
    }
    case "install": {
      if (args.length < 2) {
        console.log("\x1B[31mError: Please specify a GitHub repository URL or raw markdown URL.\x1B[0m");
        return;
      }
      const url = args[1];
      console.log(`Fetching and installing skill from: ${url}...`);
      try {
        const skill = await fetchAndInstallSkill(url);
        console.log(`\x1B[32mSuccessfully installed skill "${skill.id}" (${skill.name} v${skill.version}) to global library!\x1B[0m`);
      } catch (err) {
        console.log(`\x1B[31mError installing skill: ${err.message}\x1B[0m`);
      }
      break;
    }
    case "compile": {
      const config = readWorkspaceConfig();
      if (!config) {
        console.log("\x1B[31mError: Active workspace config not found. Run `uskills init` first.\x1B[0m");
        return;
      }
      const globalSkills = loadGlobalSkills();
      compileSkills(globalSkills, config);
      break;
    }
    case "update": {
      const config = readWorkspaceConfig();
      const globalSkills = loadGlobalSkills();
      console.log("Checking for updates for GitHub-linked skills...");
      let updatedCount = 0;
      for (const skill of globalSkills) {
        if (skill.githubUrl) {
          console.log(`Checking update for skill "${skill.id}" from ${skill.githubUrl}...`);
          try {
            const rawUrl = resolveRawGithubUrl(skill.githubUrl);
            const markdown = await fetchHttp(rawUrl);
            const globalDir = getGlobalLibraryDir();
            const filePath = path3.join(globalDir, `${skill.id}.md`);
            fs3.writeFileSync(filePath, markdown, "utf8");
            updatedCount++;
            console.log(`\x1B[32mUpdated "${skill.id}"\x1B[0m`);
          } catch (err) {
            console.log(`\x1B[31mFailed to update "${skill.id}": ${err.message}\x1B[0m`);
          }
        }
      }
      console.log(`Update check completed. ${updatedCount} skill(s) updated.`);
      if (config) {
        console.log("Re-compiling active workspace targets...");
        const freshGlobalSkills = loadGlobalSkills();
        compileSkills(freshGlobalSkills, config);
      }
      break;
    }
    default: {
      console.log(`\x1B[31mUnknown command: ${command}\x1B[0m`);
      console.log(HELP_TEXT);
      break;
    }
  }
}
main().catch((err) => {
  console.error("\x1B[31mCLI execution failed:\x1B[0m", err);
});
