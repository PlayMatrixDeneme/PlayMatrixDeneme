import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

export const rootDir = new URL('..', import.meta.url).pathname;

export async function walk(dir = rootDir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    if (entry.isFile()) files.push(path);
  }
  return files;
}

export function rel(path) {
  return relative(rootDir, path).replaceAll('\\', '/');
}

export async function exists(path) {
  try { return (await stat(join(rootDir, path))).isFile(); } catch { return false; }
}

export async function read(path) {
  return readFile(join(rootDir, path), 'utf8');
}

export function fail(title, details = []) {
  console.error(`[FAIL] ${title}`);
  details.forEach((detail) => console.error(`- ${detail}`));
  setImmediate(() => process.exit(1));
}

export function pass(title) {
  console.log(`[OK] ${title}`);
  setImmediate(() => process.exit(0));
}
