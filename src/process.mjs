import { spawn } from 'node:child_process';

export function run(command, args, { cwd, input, onLine } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, stdio: [input == null ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    const chunks = [];
    let stderr = '';
    let partial = '';
    child.stdout.on('data', chunk => {
      if (!onLine) return chunks.push(chunk);
      const lines = (partial + chunk.toString()).split('\n');
      partial = lines.pop();
      for (const line of lines) onLine(line.trim());
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-6000); });
    child.on('error', error => reject(new Error(`Could not start ${command}: ${error.message}`)));
    child.on('close', code => {
      if (code === 0) {
        if (onLine && partial.trim()) onLine(partial.trim());
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`${command} exited with code ${code}. ${stderr.trim()}`));
      }
    });
    if (input != null) {
      child.stdin.on('error', error => { if (error.code !== 'EPIPE') reject(error); });
      child.stdin.end(input);
    }
  });
}
