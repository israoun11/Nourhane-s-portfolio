// Starts the API server and the Vite dev server together:  npm run dev
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const viteBin = path.join(root, 'node_modules', '.bin', isWin ? 'vite.cmd' : 'vite');

const procs = [
  spawn(process.execPath, ['--watch-path=server', '--watch-path=shared', 'server/index.js'], { cwd: root, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } }),
  spawn(viteBin, [], { cwd: root, stdio: 'inherit', shell: isWin }),
];

const stop = () => procs.forEach((p) => !p.killed && p.kill());
procs.forEach((p) =>
  p.on('exit', (code) => {
    if (code) console.error(`\nA process stopped (code ${code}). Stopping the other one.`);
    stop();
    process.exit(code || 0);
  })
);
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
