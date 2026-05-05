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
    return "llama-3.1-8b-instant";
  }
  if (provider === "openai") {
    return "gpt-4o-mini";
  }
  throw new Error("Unsupported provider. Use groq or openai.");
}
