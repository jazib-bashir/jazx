import { getAiConfig } from "./config.js";
import { createClient, getModelForProvider } from "./provider.js";

function buildStyleInstructions(options) {
  const rules = [
    "Write a clear, meaningful git commit message from the provided staged diff.",
    "Do not use vague phrases like 'update code' or 'fix stuff'.",
    "Keep the title under 72 characters.",
    "Group related changes logically.",
  ];

  if (options.conventional) {
    rules.push(
      "Use strict Conventional Commits format: type(scope): summary or type: summary."
    );
  }

  if (options.type) {
    rules.push(
      `Force the commit type to '${options.type}'. If conventional, start with '${options.type}(...):' or '${options.type}:'.`
    );
  }

  if (options.short) {
    rules.push("Return ONLY one line (title only, no bullets, no body).");
  } else if (options.detailed) {
    rules.push(
      "Return a title and then bullet points using '* ' for important grouped changes."
    );
  } else {
    rules.push(
      "Smart mode: return a title, and include bullets only when they add clarity."
    );
  }

  return rules.join("\n");
}

export async function generateCommitMessage(diff, options = {}) {
  const { provider, apiKey } = await getAiConfig();
  const client = createClient(provider, apiKey);
  const model = getModelForProvider(provider);
  const instruction = buildStyleInstructions(options);

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are an expert release engineer that writes high-quality git commit messages.",
      },
      {
        role: "user",
        content: `${instruction}\n\nStaged diff:\n${diff}`,
      },
    ],
  });

  const text = (response.output_text || "").trim();
  if (!text) {
    throw new Error("AI returned an empty commit message.");
  }
  return text;
}
