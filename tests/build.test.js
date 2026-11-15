import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFile, mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const root = new URL('../', import.meta.url);
const assets = ['app.js', 'engine.js', 'index.html', 'storage.js', 'style.css'];

test('the static build from a clean directory contains exactly the playable files', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'anomalous-build-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  for (const file of ['build.js', 'package.json', 'README.md', ...assets]) {
    await copyFile(new URL(file, root), join(dir, file));
  }

  execFileSync(process.execPath, ['build.js'], {cwd: dir, timeout: 10000});
  const output = join(dir, 'dist');
  assert.deepEqual((await readdir(output)).sort(), assets);
  for (const file of assets) {
    assert.ok((await readFile(join(output, file))).equals(await readFile(new URL(file, root))),
      `dist/${file} must match the corresponding source file`);
  }
});

test('the checked-in preview is in sync with the game source', async () => {
  assert.deepEqual((await readdir(new URL('dist/', root))).sort(), assets);
  for (const file of assets) {
    assert.ok((await readFile(new URL(`dist/${file}`, root))).equals(await readFile(new URL(file, root))),
      `dist/${file} is stale; run npm run build and commit the regenerated files`);
  }
});
