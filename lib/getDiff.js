import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function getStagedDiff() {
  try {
    let stdout = "";
    try {
      ({ stdout } = await execFileAsync("git", ["diff", "--staged"], {
        maxBuffer: 1024 * 1024 * 10,
      }));
    } catch {
      // Older Git versions may not support --staged.
      ({ stdout } = await execFileAsync("git", ["diff", "--cached"], {
        maxBuffer: 1024 * 1024 * 10,
      }));
    }
    const diff = stdout.trim();
    if (!diff) {
      throw new Error("No staged changes found. Stage files before committing.");
    }
    return diff;
  } catch (error) {
    if (error?.message?.includes("No staged changes found")) {
      throw error;
    }
    if (error?.code === "ENOENT") {
      throw new Error("Git is not installed or not available in PATH.");
    }
    throw new Error(`Failed to read staged diff: ${error.message}`);
  }
}
