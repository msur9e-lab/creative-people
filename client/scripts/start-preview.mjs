import { spawn } from 'node:child_process';

const port = process.env.PORT || '4173';
const vite = spawn('vite', ['preview', '--host', '0.0.0.0', '--port', port, '--strictPort'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

vite.on('error', (error) => {
  console.error('Failed to start the production preview server:', error);
  process.exitCode = 1;
});

vite.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
