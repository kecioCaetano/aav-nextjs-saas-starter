import { randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import postgres from 'postgres';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Set TEST_DATABASE_URL to a dedicated test database before running Playwright.');
}
const port = process.env.E2E_PORT || '3199';
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('E2E_PORT must be a valid TCP port.');
}

const schema = `playwright_${randomUUID().replaceAll('-', '')}`;
const distDir = `.next-e2e/${schema}`;
const tsconfig = `tsconfig.${schema}.json`;
let nextEnvBefore;
try {
  nextEnvBefore = await readFile('next-env.d.ts', 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const client = postgres(databaseUrl, { max: 1 });
let created = false;
let tsconfigCreated = false;
let child;
let interrupted = false;
const stopChild = () => {
  interrupted = true;
  child?.kill('SIGTERM');
};
process.on('SIGINT', stopChild);
process.on('SIGTERM', stopChild);

try {
  await client`CREATE SCHEMA ${client(schema)}`;
  created = true;
  await client`SET search_path TO ${client(schema)}`;
  const migration = await readFile(
    new URL('../../lib/db/migrations/0000_soft_the_anarchist.sql', import.meta.url),
    'utf8'
  );
  for (const statement of migration.split('--> statement-breakpoint')) {
    await client.unsafe(statement.replaceAll('"public".', `"${schema}".`));
  }

  const url = new URL(databaseUrl);
  url.searchParams.set('search_path', schema);
  await writeFile(tsconfig, JSON.stringify({
    extends: './tsconfig.json',
    include: [
      'next-env.d.ts', '**/*.ts', '**/*.tsx',
      '.next/types/**/*.ts', '.next/dev/types/**/*.ts', `${distDir}/dev/types/**/*.ts`
    ]
  }, null, 2), { flag: 'wx' });
  tsconfigCreated = true;
  child = spawn('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      E2E_DATABASE_URL: url.toString(),
      E2E_PORT: port,
      PLAYWRIGHT_DIST_DIR: distDir,
      PLAYWRIGHT_TSCONFIG: tsconfig
    }
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  process.exitCode = interrupted ? 1 : exitCode;
} finally {
  process.off('SIGINT', stopChild);
  process.off('SIGTERM', stopChild);
  try {
    if (created) await client`DROP SCHEMA ${client(schema)} CASCADE`;
  } finally {
    await client.end();
    const nextEnvAfter = await readFile('next-env.d.ts', 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    });
    if (nextEnvAfter?.includes(`./${distDir}/`)) {
      if (nextEnvBefore === undefined) await rm('next-env.d.ts');
      else await writeFile('next-env.d.ts', nextEnvBefore);
    }
    if (tsconfigCreated) {
      await rm(tsconfig, { force: true });
      await rm(distDir, { recursive: true, force: true });
    }
  }
}
