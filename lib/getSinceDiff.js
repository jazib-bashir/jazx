import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_EXCLUDES = [
  "node_modules/**",
  "dist/**",
  "build/**",
  "*.lock",
  "*.min.js",
];

function escapeRegex(input) {
  return input.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function globToRegex(pattern) {
  const normalized = pattern.trim().replace(/\\/g, "/");
  if (!normalized) {
    return /^$/;
  }
  const escaped = escapeRegex(normalized)
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function parsePatterns(patterns) {
  if (!patterns) {
    return [];
  }
  return patterns
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchesAny(path, patterns) {
  return patterns.some((pattern) => globToRegex(pattern).test(path));
}

function applyFileFilters(filePaths, includePatterns) {
  const withoutNoise = filePaths.filter(
    (filePath) => !matchesAny(filePath, DEFAULT_EXCLUDES)
  );
  if (!includePatterns.length) {
    return withoutNoise;
  }
  return withoutNoise.filter((filePath) => matchesAny(filePath, includePatterns));
}

function parseSinceInput(since) {
  const trimmed = String(since || "").trim().toLowerCase();
  const match = trimmed.match(/^(\d+)([dw])$/);
  if (!match) {
    throw new Error("Invalid --since format. Use values like 1d, 2d, 1w, 3w.");
  }
  const value = Number(match[1]);
  const unit = match[2] === "d" ? "day" : "week";
  const unitLabel = value === 1 ? unit : `${unit}s`;
  return `${value} ${unitLabel} ago`;
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
    const stderr = String(error?.stderr || "").trim();
    if (stderr.includes("not a git repository")) {
      throw new Error("Current directory is not a git repository.");
    }
    throw new Error(`Git command failed (${args.join(" ")}). ${stderr || error.message}`);
  }
}

export async function getSinceAnalysisContext({ since, files }) {
  const gitSince = parseSinceInput(since);
  const includePatterns = parsePatterns(files);

  const commits = await runGit(["log", `--since=${gitSince}`, "--oneline"]);
  if (!commits) {
    throw new Error("No changes found in the given time range");
  }

  const nameOnly = await runGit(["diff", `--since=${gitSince}`, "--name-only"]);
  const fileList = nameOnly
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const filteredFiles = applyFileFilters(fileList, includePatterns);

  if (!filteredFiles.length) {
    throw new Error("No matching files found");
  }

  const diff = await runGit(["diff", `--since=${gitSince}`, "--", ...filteredFiles]);
  if (!diff) {
    throw new Error("No relevant changes found");
  }

  return { diff, commits, filteredFiles, gitSince };
}
