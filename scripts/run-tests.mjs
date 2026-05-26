import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { build } from 'esbuild';

const testEntries = [
  'tests/csvParser.test.ts',
  'tests/enrich.test.ts',
  'tests/tickerMapper.test.ts',
];
const outdir = '.tmp/tests';

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

await build({
  entryPoints: testEntries,
  outdir,
  bundle: true,
  platform: 'node',
  format: 'esm',
  sourcemap: 'inline',
  entryNames: '[name]',
});

const compiledTests = testEntries.map((entry) =>
  join(outdir, basename(entry).replace(/\.ts$/, '.js'))
);

const child = spawn(process.execPath, ['--test', ...compiledTests], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
