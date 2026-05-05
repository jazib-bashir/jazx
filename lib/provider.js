import OpenAI from "openai";

export function createClient(provider, apiKey) {
  if (provider === "groq") {
    return new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  if (provider === "openai") {
    return new OpenAI({ apiKey });
  }

  throw new Error("Unsupported provider. Use groq or openai.");
}

export function getModelForProvider(provider) {
  if (provider === "groq") {
    return "llama3-8b-8192";
  }
  if (provider === "openai") {
    return "gpt-4o-mini";
  }
  throw new Error("Unsupported provider. Use groq or openai.");
}
