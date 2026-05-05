import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(os.homedir(), ".jazx");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const VALID_PROVIDERS = ["groq", "openai"];
const DEFAULT_PROVIDER = "groq";

function maskApiKey(apiKey) {
  if (!apiKey) {
    return "";
  }
  const visible = apiKey.slice(0, 7);
  return `${visible}****`;
}

function validateProvider(provider) {
  if (!VALID_PROVIDERS.includes(provider)) {
    throw new Error("Invalid provider. Use: groq or openai");
  }
}

async function readConfigFile() {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }
    if (error instanceof SyntaxError) {
      throw new Error(
        "Invalid config file at ~/.jazx/config.json. Re-run jazx config commands."
      );
    }
    throw new Error(`Failed to read config: ${error.message}`);
  }
}

async function writeConfigFile(config) {
  try {
    await mkdir(CONFIG_DIR, { recursive: true });
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  } catch (error) {
    throw new Error(`Failed to write config: ${error.message}`);
  }
}

export async function setApiKey(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("API key is required. Usage: jazx config set-key <apiKey>");
  }

  const existing = await readConfigFile();
  const provider = existing.provider || DEFAULT_PROVIDER;
  validateProvider(provider);

  const payload = { provider, apiKey: apiKey.trim() };
  await writeConfigFile(payload);
  return {
    configPath: CONFIG_PATH,
    maskedKey: maskApiKey(payload.apiKey),
  };
}

export async function setProvider(provider) {
  const normalized = (provider || "").trim().toLowerCase();
  validateProvider(normalized);

  const existing = await readConfigFile();
  const payload = {
    provider: normalized,
    apiKey: typeof existing.apiKey === "string" ? existing.apiKey : "",
  };
  await writeConfigFile(payload);
  return normalized;
}

export async function getAiConfig() {
  const fileConfig = await readConfigFile();
  const provider = fileConfig.provider || DEFAULT_PROVIDER;
  validateProvider(provider);

  if (typeof fileConfig.apiKey === "string" && fileConfig.apiKey.trim()) {
    return { provider, apiKey: fileConfig.apiKey.trim() };
  }

  const envApiKey =
    provider === "groq"
      ? process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
      : process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;

  if (envApiKey?.trim()) {
    return { provider, apiKey: envApiKey.trim() };
  }

  throw new Error("❌ No API key found.\n\nRun:\njazx config set-key <your-key>");
}

export function getValidProviders() {
  return [...VALID_PROVIDERS];
}

export async function getApiKey() {
  const { apiKey } = await getAiConfig();
  if (!apiKey) {
    throw new Error(
      "❌ No API key found.\n\nRun:\njazx config set-key <your-key>"
    );
  }
  return apiKey;
}
