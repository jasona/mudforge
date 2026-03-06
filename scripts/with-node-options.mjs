import { spawn } from 'child_process';
import { accessSync, constants } from 'fs';
import { delimiter, dirname, isAbsolute, join } from 'path';

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

function isExecutable(filePath) {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveCommand(cmd) {
  if (process.platform !== 'win32') {
    return cmd;
  }

  const hasPathSeparator = cmd.includes('\\') || cmd.includes('/');
  const pathEntries = hasPathSeparator
    ? [dirname(isAbsolute(cmd) ? cmd : join(process.cwd(), cmd))]
    : (process.env.PATH ?? '').split(delimiter).filter(Boolean);

  const pathext = (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean);

  for (const entry of pathEntries) {
    const base = hasPathSeparator ? cmd : join(entry, cmd);

    if (isExecutable(base)) {
      return base;
    }

    for (const ext of pathext) {
      const candidate = base.endsWith(ext) ? base : `${base}${ext}`;
      if (isExecutable(candidate)) {
        return candidate;
      }
    }
  }

  return cmd;
}

const child = spawn(resolveCommand(command), args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
});

child.on('error', (error) => {
  console.error(`Failed to start command "${command}":`, error.message);
  process.exit(typeof error.errno === 'number' ? error.errno : 1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
