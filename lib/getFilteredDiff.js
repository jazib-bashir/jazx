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
  const includes = includePatterns || [];
  const withoutNoise = filePaths.filter(
    (filePath) => !matchesAny(filePath, DEFAULT_EXCLUDES)
  );
  if (!includes.length) {
    return withoutNoise;
  }
  return withoutNoise.filter((filePath) => matchesAny(filePath, includes));
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

async function getStagedNameOnly() {
  try {
    return await runGit(["diff", "--staged", "--name-only"]);
  } catch {
    return await runGit(["diff", "--cached", "--name-only"]);
  }
}

async function getStagedFilteredDiff(files) {
  if (!files.length) {
    return "";
  }
  try {
    return await runGit(["diff", "--staged", "--", ...files]);
  } catch {
    return await runGit(["diff", "--cached", "--", ...files]);
  }
}

export async function getFilteredAnalysisContext({
  staged = false,
  baseBranch,
  targetBranch,
  files,
}) {
  const includePatterns = parsePatterns(files);
  const fileListOutput = staged
    ? await getStagedNameOnly()
    : await runGit(["diff", `${baseBranch}...${targetBranch}`, "--name-only"]);

  const fileList = fileListOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const filteredFiles = applyFileFilters(fileList, includePatterns);

  if (!filteredFiles.length) {
    throw new Error("No matching files found");
  }

  const diff = staged
    ? await getStagedFilteredDiff(filteredFiles)
    : await runGit(["diff", `${baseBranch}...${targetBranch}`, "--", ...filteredFiles]);

  if (!diff.trim()) {
    throw new Error("No relevant changes found");
  }

  const commits = staged
    ? ""
    : await runGit(["log", `${baseBranch}..${targetBranch}`, "--oneline"]);

  return { diff, commits, filteredFiles };
}
