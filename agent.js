import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { db } from './db.js';
import { resolveCloudModel } from './gemini.js';

import os from 'node:os';

const execAsync = promisify(exec);

function resolveDefaultWorkspace() {
  try {
    const saved = db.getSetting('workspace_dir');
    if (saved && fs.existsSync(saved)) return saved;
  } catch (_) {}

  if (process.env.LOLY_WORKSPACE && fs.existsSync(process.env.LOLY_WORKSPACE)) {
    return path.resolve(process.env.LOLY_WORKSPACE);
  }

  const cwd = process.cwd();
  if (!cwd.includes('app.asar') && !cwd.startsWith('/opt') && cwd !== '/' && !cwd.includes('System32')) {
    return cwd;
  }

  const docs = path.join(os.homedir(), 'Documents');
  if (fs.existsSync(docs)) return docs;
  return os.homedir();
}

// Current active workspace directory
let activeWorkspaceDir = resolveDefaultWorkspace();

export function getWorkspaceDir() {
  return activeWorkspaceDir;
}

export function setWorkspaceDir(dirPath) {
  if (dirPath && fs.existsSync(dirPath)) {
    activeWorkspaceDir = path.resolve(dirPath);
    try {
      db.setSetting('workspace_dir', activeWorkspaceDir);
    } catch (_) {}
    return activeWorkspaceDir;
  }
  return null;
}

function resolveSafePath(filePath) {
  const resolved = path.resolve(activeWorkspaceDir, filePath);
  // Ensure path is inside active workspace boundary
  if (!resolved.startsWith(activeWorkspaceDir)) {
    throw new Error(`Security Violation: Path '${filePath}' is outside workspace boundary '${activeWorkspaceDir}'.`);
  }
  return resolved;
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  '.next',
  '.cache',
  'coverage'
]);

// 1. List files in workspace
export function listFiles(subDir = '') {
  const targetDir = subDir ? resolveSafePath(subDir) : activeWorkspaceDir;
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Directory '${subDir}' does not exist.`);
  }

  const results = [];
  function scan(dir, depth = 0) {
    if (depth > 5) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(activeWorkspaceDir, fullPath);

      if (entry.isDirectory()) {
        results.push({ path: relPath + '/', type: 'directory' });
        scan(fullPath, depth + 1);
      } else {
        const stats = fs.statSync(fullPath);
        results.push({ path: relPath, type: 'file', size: stats.size });
      }
    }
  }

  scan(targetDir, 0);
  return results.slice(0, 100);
}

// 2. Read file content with line numbers
export function readFile(filePath) {
  const resolved = resolveSafePath(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File '${filePath}' not found.`);
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const lines = content.split('\n');
  const preview = lines.map((l, i) => `${i + 1}: ${l}`).join('\n');
  return {
    path: path.relative(activeWorkspaceDir, resolved),
    totalLines: lines.length,
    content: preview.length > 30000 ? preview.slice(0, 30000) + '\n... [truncated]' : preview,
    rawContent: content
  };
}

// 3. Edit file by replacing target_content with replacement_content
export function editFile(filePath, targetContent, replacementContent) {
  const resolved = resolveSafePath(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File '${filePath}' does not exist.`);
  }

  const original = fs.readFileSync(resolved, 'utf-8');
  if (!original.includes(targetContent)) {
    throw new Error(`Could not find exact targetContent in '${filePath}'. Make sure whitespace and line numbers match.`);
  }

  const occurrences = original.split(targetContent).length - 1;
  if (occurrences > 1) {
    throw new Error(`Target content was found ${occurrences} times in '${filePath}'. Please provide more unique surrounding lines.`);
  }

  const updated = original.replace(targetContent, replacementContent);
  fs.writeFileSync(resolved, updated, 'utf-8');

  // Simple diff stats
  const oldLines = targetContent.split('\n').length;
  const newLines = replacementContent.split('\n').length;
  const relPath = path.relative(activeWorkspaceDir, resolved);

  db.logEvent('agent-session', 'Loly-Agent', 'file_edit', `Modified ${relPath}`, `(-${oldLines} +${newLines})`);

  return {
    success: true,
    path: relPath,
    linesChanged: { old: oldLines, new: newLines },
    diffSummary: `Updated ${relPath} (-${oldLines} lines, +${newLines} lines)`
  };
}

// 4. Create or overwrite a file
export function writeFile(filePath, content) {
  const resolved = resolveSafePath(filePath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const isNew = !fs.existsSync(resolved);
  fs.writeFileSync(resolved, content, 'utf-8');
  const relPath = path.relative(activeWorkspaceDir, resolved);

  db.logEvent('agent-session', 'Loly-Agent', isNew ? 'file_create' : 'file_write', `${isNew ? 'Created' : 'Updated'} ${relPath}`, `${content.length} bytes`);

  return {
    success: true,
    path: relPath,
    isNew,
    bytes: content.length
  };
}

// 5. Run shell command in workspace
export async function runCommand(command) {
  const dangerousPatterns = [/rm\s+-rf\s+[\/~]/, /drop\s+database/i, /format\s+[a-z]:/i];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      throw new Error(`Command blocked by Loly Safety Engine: '${command}'`);
    }
  }

  try {
    const { stdout, stderr } = await execAsync(command, { cwd: activeWorkspaceDir, timeout: 30000 });
    const output = (stdout + (stderr ? '\n' + stderr : '')).trim();
    db.logEvent('agent-session', 'Loly-Agent', 'bash_command', `Executed: ${command.slice(0, 40)}`, output.slice(0, 200));
    return {
      success: true,
      command,
      output: output.length > 5000 ? output.slice(0, 5000) + '... [truncated]' : output
    };
  } catch (err) {
    return {
      success: false,
      command,
      error: err.message,
      output: (err.stdout || '') + (err.stderr || '')
    };
  }
}

// Gemini Tool Definitions
export const AGENT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'list_files',
        description: 'List project files and directories in the workspace folder.',
        parameters: {
          type: 'OBJECT',
          properties: {
            directory: { type: 'STRING', description: 'Relative directory path to list (e.g. "" or "public" or "src")' }
          }
        }
      },
      {
        name: 'read_file',
        description: 'Read the contents of a specific file in the workspace.',
        parameters: {
          type: 'OBJECT',
          properties: {
            filepath: { type: 'STRING', description: 'Relative path of the file to read (e.g. "server.js" or "public/style.css")' }
          },
          required: ['filepath']
        }
      },
      {
        name: 'edit_file',
        description: 'Edit a specific block of code inside a file by replacing exact target_content with replacement_content.',
        parameters: {
          type: 'OBJECT',
          properties: {
            filepath: { type: 'STRING', description: 'Relative path of the file to edit' },
            target_content: { type: 'STRING', description: 'The exact existing character sequence to replace' },
            replacement_content: { type: 'STRING', description: 'The new replacement code' }
          },
          required: ['filepath', 'target_content', 'replacement_content']
        }
      },
      {
        name: 'write_file',
        description: 'Create a new file or completely overwrite an existing file with the given content.',
        parameters: {
          type: 'OBJECT',
          properties: {
            filepath: { type: 'STRING', description: 'Relative path of the file to write' },
            content: { type: 'STRING', description: 'Complete content to write into the file' }
          },
          required: ['filepath', 'content']
        }
      },
      {
        name: 'run_command',
        description: 'Execute a bash terminal command in the workspace root.',
        parameters: {
          type: 'OBJECT',
          properties: {
            command: { type: 'STRING', description: 'The terminal command line to execute (e.g. "npm test" or "ls -la")' }
          },
          required: ['command']
        }
      }
    ]
  }
];

export const AGENT_SYSTEM_INSTRUCTION = `You are Loly, an autonomous AI Coding Agent Companion.
You have direct tools to inspect, read, edit, and create code across files in the user's workspace directory (${activeWorkspaceDir}).

Guidelines:
- When asked to edit code, add a feature, refactor, or fix a bug:
  1. Use list_files or read_file to inspect the necessary code files first.
  2. Use edit_file to apply surgical changes or write_file to create new files.
  3. You can edit across MULTIPLE files in sequence if the task requires it.
  4. Always maintain clean, working code.
- When done, summarize what you edited and why in a concise, friendly manner (keep the conversational summary short, like Loly).`;

// Execute Tool by Name
export async function executeTool(name, args) {
  switch (name) {
    case 'list_files':
      return listFiles(args.directory || '');
    case 'read_file':
      return readFile(args.filepath);
    case 'edit_file':
      return editFile(args.filepath, args.target_content, args.replacement_content);
    case 'write_file':
      return writeFile(args.filepath, args.content);
    case 'run_command':
      return await runCommand(args.command);
    default:
      throw new Error(`Unknown tool '${name}'`);
  }
}

// Autonomous Multi-Turn Agent Runner
export async function runCodingAgent({
  prompt,
  history = [],
  apiKey,
  model = 'gemini-3.5-flash',
  onStep = () => {}
}) {
  const activeKey = apiKey || process.env.GEMINI_API_KEY;
  if (!activeKey) {
    throw new Error('Gemini API key is required to run the coding agent.');
  }

  const effectiveModel = resolveCloudModel(model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(effectiveModel)}:generateContent?key=${encodeURIComponent(activeKey)}`;

  // Convert history + current prompt to Gemini contents
  const contents = history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const toolExecutions = [];
  const maxIterations = 8;
  let iterations = 0;
  let finalAssistantReply = '';

  while (iterations < maxIterations) {
    iterations++;

    const body = {
      contents,
      tools: AGENT_TOOLS,
      systemInstruction: {
        parts: [{ text: AGENT_SYSTEM_INSTRUCTION }]
      },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = errText;
      try {
        msg = JSON.parse(errText).error?.message || errText;
      } catch (_) {}
      throw new Error(`Gemini Agent Error (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content) {
      break;
    }

    const modelParts = candidate.content.parts || [];
    contents.push(candidate.content);

    // Check for function calls
    const functionCallPart = modelParts.find(p => p.functionCall);
    const textPart = modelParts.find(p => p.text);

    if (textPart && textPart.text) {
      finalAssistantReply += textPart.text;
    }

    if (!functionCallPart) {
      // Agent finished, returned text reply
      break;
    }

    const { name, args } = functionCallPart.functionCall;
    onStep({
      type: 'tool_call',
      name,
      args
    });

    let toolResult;
    try {
      toolResult = await executeTool(name, args);
      toolExecutions.push({ name, args, result: toolResult, success: true });
      onStep({
        type: 'tool_result',
        name,
        result: toolResult,
        success: true
      });
    } catch (err) {
      toolResult = { error: err.message };
      toolExecutions.push({ name, args, error: err.message, success: false });
      onStep({
        type: 'tool_result',
        name,
        error: err.message,
        success: false
      });
    }

    // Feed functionResponse back to model
    contents.push({
      role: 'user',
      parts: [
        {
          functionResponse: {
            name,
            response: { content: toolResult }
          }
        }
      ]
    });
  }

  return {
    reply: finalAssistantReply || 'Agent tasks completed.',
    toolExecutions,
    workspace: activeWorkspaceDir
  };
}
