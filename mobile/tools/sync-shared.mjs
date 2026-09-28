#!/usr/bin/env node
// Re-vendor the platform's shared code into src/shared.
// Usage: npm run sync-shared [-- /path/to/unibody-front-end]   (default: .., the front-end repo root)
import { cpSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const platform = resolve(process.argv[2] ?? '..');
const from = join(platform, 'shared', 'src');
const to = resolve('src/shared');
if (!existsSync(from)) {
  console.error(`Not found: ${from}`);
  process.exit(1);
}
for (const f of readdirSync(to)) rmSync(join(to, f), { recursive: true, force: true });
for (const f of readdirSync(from)) {
  if (/\.test\.ts$/.test(f)) continue;
  cpSync(join(from, f), join(to, f), { recursive: true });
}
console.log(`Synced ${from} -> ${to}. Run "npx tsc --noEmit" and re-check zod version matches platform shared/package.json.`);
