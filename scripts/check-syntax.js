import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectJavaScriptFiles(target);
    return entry.name.endsWith('.js') ? [target] : [];
  }));
  return nested.flat();
}

const targets = ['src', 'scripts', 'test'];
const files = (await Promise.all(targets.map(async (target) => {
  try {
    return await collectJavaScriptFiles(target);
  } catch {
    return [];
  }
}))).flat();

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`${files.length} file JavaScript lolos pemeriksaan sintaks.`);
