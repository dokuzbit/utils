#!/usr/bin/env node

/**
 * Copy AI context files to the project root for better AI assistant integration
 */

import { copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageRoot = join(__dirname, "..");
const projectRoot = process.cwd();

const files = [
  { src: "AI_CONTEXT.md", desc: "AI Context file for assistants" },
  { src: ".cursorrules", desc: "Cursor AI rules file" },
];

console.log("🤖 Setting up AI assistant integration...\n");

files.forEach(({ src, desc }) => {
  const source = join(packageRoot, src);
  const target = join(projectRoot, src);

  if (existsSync(target)) {
    console.log(`⚠️  ${src} already exists, skipping...`);
    return;
  }

  try {
    copyFileSync(source, target);
    console.log(`✅ Copied ${src} - ${desc}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${src}:`, error.message);
  }
});

console.log("\n✨ AI assistant setup complete!");
console.log("\nFor Cursor users: .cursorrules is now active");
console.log("For other AI assistants: Share AI_CONTEXT.md with your AI\n");
