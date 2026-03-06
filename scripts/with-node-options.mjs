import { spawn } from 'child_process';

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Usage: node scripts/with-node-options.mjs <command> [args...]');
  process.exit(1);
}

const requiredOption = '--no-node-snapshot';
const currentNodeOptions = process.env.NODE_OPTIONS ?? '';
const nodeOptions = currentNodeOptions.includes(requiredOption)
  ? currentNodeOptions
  : `${requiredOption} ${currentNodeOptions}`.trim();

const child = spawn(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
