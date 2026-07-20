import * as fs from 'fs';
import * as path from 'path';
import { CliSkill, WorkspaceConfig } from './parser';

const BLOCK_START = '# === UNIVERSAL SKILLS AUTO-GENERATED BLOCK (DO NOT EDIT) ===';
const BLOCK_END = '# === END OF UNIVERSAL SKILLS BLOCK ===';

export function compileSkills(globalSkills: CliSkill[], config: WorkspaceConfig): void {
  const activeSkills = globalSkills.filter(s => config.skills.includes(s.id));
  
  if (activeSkills.length === 0) {
    console.log('\x1b[33mNo active skills configured in workspace config.\x1b[0m');
  }

  // Compile prompt payload
  let compiledPayload = '';
  for (const skill of activeSkills) {
    compiledPayload += `\n======================================================================\n`;
    compiledPayload += `[UNIVERSAL SKILL ACTIVE: ${skill.name} (v${skill.version})]\n`;
    compiledPayload += `Description: ${skill.description}\n`;
    if (skill.author) compiledPayload += `Author: ${skill.author}\n`;
    compiledPayload += `----------------------------------------------------------------------\n`;
    compiledPayload += `${skill.content.replace(/^---[\s\S]*?---/, '').trim()}\n`;
    compiledPayload += `======================================================================\n`;
  }

  // Compile targets
  const targets = config.targets;

  if (targets.claudemd?.enabled) {
    updateTargetFile(
      path.join(process.cwd(), targets.claudemd.output),
      compiledPayload,
      targets.claudemd.includeHeader ? getClaudeMdHeader(config.project) : ''
    );
  }

  if (targets.cursorrules?.enabled) {
    updateTargetFile(
      path.join(process.cwd(), targets.cursorrules.output),
      compiledPayload,
      ''
    );
  }

  if (targets.copilot?.enabled) {
    // Ensure parent directory exists for .github/copilot-instructions.md
    const outputPath = path.join(process.cwd(), targets.copilot.output);
    const parentDir = path.dirname(outputPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    updateTargetFile(outputPath, compiledPayload, '');
  }
}

function updateTargetFile(filePath: string, compiledPayload: string, header: string): void {
  let existingContent = '';
  if (fs.existsSync(filePath)) {
    existingContent = fs.readFileSync(filePath, 'utf8');
  }

  const generatedBlock = `${BLOCK_START}\n${compiledPayload.trim()}\n${BLOCK_END}`;
  
  let newContent = '';
  const startIdx = existingContent.indexOf(BLOCK_START);
  const endIdx = existingContent.indexOf(BLOCK_END);

  if (startIdx > -1 && endIdx > -1 && endIdx > startIdx) {
    // Replace the block
    newContent = 
      existingContent.slice(0, startIdx).trim() + 
      '\n\n' + 
      generatedBlock + 
      '\n\n' + 
      existingContent.slice(endIdx + BLOCK_END.length).trim();
  } else {
    // Append or prepend block
    if (existingContent.trim()) {
      newContent = existingContent.trim() + '\n\n' + generatedBlock;
    } else {
      newContent = (header ? header.trim() + '\n\n' : '') + generatedBlock;
    }
  }

  fs.writeFileSync(filePath, newContent.trim() + '\n', 'utf8');
  console.log(`\x1b[32mSuccessfully compiled target: ${path.basename(filePath)}\x1b[0m`);
}

function getClaudeMdHeader(projectName: string): string {
  return `# CLAUDE.md Rules for ${projectName}\n\nThis file contains instructions, commands, and active prompt alignment configurations.`;
}
