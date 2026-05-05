import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const execFileAsync = promisify(execFile);

export async function confirmApply(message) {
  const rl = createInterface({ input, output });
  try {
    output.write("\nProposed commit message:\n\n");
    output.write(`${message}\n\n`);
    const answer = await rl.question("Apply this commit message? (y/n): ");
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

export async function applyCommitMessage(message) {
  // Passing commit message as arg avoids shell-escaping pitfalls.
  await execFileAsync("git", ["commit", "-m", message], {
    maxBuffer: 1024 * 1024 * 5,
  });
}
