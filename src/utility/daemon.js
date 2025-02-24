import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const child = spawn("bun", ["production"], { cwd: dir });

child.stdout.on("data", (data) => {
  console.log(data.toString());
});

child.stderr.on("data", (data) => {
  console.error(data.toString());
});

child.on("close", (code) => {
  console.log(`Child process exited with code ${code}`);
});