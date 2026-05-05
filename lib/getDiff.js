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

async function runGit(args) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      maxBuffer: 1024 * 1024 * 10,
    });
    return stdout.trim();
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("Git is not installed or not available in PATH.");
    }
    throw new Error(`Git command failed (${args.join(" ")}): ${error.message}`);
  }
}

async function branchExists(branch) {
  try {
    await execFileAsync("git", ["rev-parse", "--verify", branch], {
      maxBuffer: 1024 * 1024,
    });
    return true;
  } catch {
    return false;
  }
}

export async function resolvePRBranches(fromBranch, toBranch) {
  if ((fromBranch && !toBranch) || (!fromBranch && toBranch)) {
    throw new Error("Use both --from and --to together, or provide neither.");
  }

  if (fromBranch && toBranch) {
    return { baseBranch: fromBranch, targetBranch: toBranch };
  }

  const targetBranch = await runGit(["branch", "--show-current"]);
  if (!targetBranch) {
    throw new Error("Failed to detect current branch.");
  }

  const baseBranch = (await branchExists("develop")) ? "develop" : "main";
  return { baseBranch, targetBranch };
}

export async function getPRContext(baseBranch, targetBranch) {
  const diff = await runGit(["diff", `${baseBranch}...${targetBranch}`]);
  const commits = await runGit(["log", `${baseBranch}..${targetBranch}`, "--oneline"]);

  if (!diff && !commits) {
    throw new Error(
      `No branch changes found between ${baseBranch} and ${targetBranch}.`
    );
  }

  return { diff, commits };
}
