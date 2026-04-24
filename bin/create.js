#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Recursively copy src -> dest, skipping excluded names.
 * Also: rename "gitignore" -> ".gitignore" on copy.
 */
const EXCLUDED = new Set([
  'node_modules',
  '.next',
  '.turbo',
  '.git',
  'bun.lock',
  'bun.lockb',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'next-env.d.ts',
]);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    // Rename bare "gitignore" -> ".gitignore" in the destination
    const destName = entry.name === 'gitignore' ? '.gitignore' : entry.name;
    const destPath = path.join(dest, destName);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function isEmptyDir(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath);
    return entries.length === 0;
  } catch {
    return true; // does not exist -> treat as empty
  }
}

function hasGit() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const arg = process.argv[2];
const projectName = arg || 'my-infinite-app';

let targetDir;
if (projectName === '.') {
  targetDir = process.cwd();
} else {
  targetDir = path.resolve(process.cwd(), projectName);
}

const displayName = path.basename(targetDir);
const packageName = toKebabCase(displayName) || 'my-infinite-app';

// Refuse if target exists and is non-empty
if (fs.existsSync(targetDir) && !isEmptyDir(targetDir)) {
  console.error(`\nError: Target directory "${targetDir}" already exists and is not empty.`);
  console.error('Choose a different name or delete the directory first.\n');
  process.exit(1);
}

console.log(`\nCreating a new nextjs-claw app in ${targetDir}...\n`);

// Locate the template relative to this script
const templateDir = path.join(__dirname, '..', 'template');

if (!fs.existsSync(templateDir)) {
  console.error('Error: template/ directory not found next to bin/create.js');
  process.exit(1);
}

// Copy template -> target
copyDir(templateDir, targetDir);

// Update package.json name
const pkgPath = path.join(targetDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.name = packageName;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

// git init
if (hasGit()) {
  try {
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });
  } catch {
    // non-fatal — user can init manually
  }
}

// ---------------------------------------------------------------------------
// Success message
// ---------------------------------------------------------------------------

const cdStep = projectName === '.' ? '' : `  cd ${displayName}\n`;

console.log(`Created ${displayName}!

Get started:
${cdStep}  bun install
  bun dev

Then open http://localhost:3000 and start chatting with your app.

Requirements:
  - Bun (https://bun.sh)
  - Claude Code CLI, authenticated: \`npm i -g @anthropic-ai/claude-code && claude login\`
    (The app spawns \`claude\` as a subprocess and uses your subscription.)
`);
