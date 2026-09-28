#!/usr/bin/env node
// shared/ is owned by the unibody-back-end repo. This copies it into this repo (shared/src)
// and re-vendors it into the mobile app (mobile/src/shared).
// Usage: pnpm sync-shared [/path/to/unibody-back-end]   (default: ../unibody-back-end)
import { cpSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const backEnd = resolve(process.argv[2] ?? '../unibody-back-end');
const from = join(backEnd, 'shared', 'src');
if (!existsSync(from)) {
  console.error(`Not found: ${from}`);
  process.exit(1);
}
const to = resolve('shared/src');
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
console.log(`Synced ${from} -> ${to}`);
execFileSync('node', ['tools/sync-shared.mjs', '..'], { cwd: resolve('mobile'), stdio: 'inherit' });
