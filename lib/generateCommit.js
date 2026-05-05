import { getAiConfig } from "./config.js";
import { createClient, getModelForProvider } from "./provider.js";

function buildStyleInstructions(options) {
  const rules = [
    "You are generating a git commit message.",
    "STRICT RULES:",
    "- Follow conventional commit format: type(scope): short description",
    "- Keep title under 72 characters",
    "- Use imperative tone",
    "- Avoid vague phrases like 'update code' or 'fix stuff'",
    "- Be specific about what changed",
    "- Infer scope from changed file paths when possible",
    "- Group related changes logically",
    "- Return only the commit message text",
    "- Do not include explanations, headings, labels, or code fences",
  ];

  if (options.type) {
    rules.push(
      `Force the commit type to '${options.type}'.`
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

  if (options.custom) {
    rules.push(`Additional instruction from user: ${options.custom}`);
  }

  return rules.join("\n");
}

function cleanGeneratedMessage(text, options = {}) {
  if (!text) {
    return "";
  }

  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  cleaned = cleaned.replace(
    /^(here is|generated commit message|commit message)\b[^:\n]*:\s*/i,
    ""
  );

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return "";
  }

  const titleLine = lines.find((line) => !line.startsWith("*")) || lines[0];
  const bulletLines = lines.filter((line) => line.startsWith("*"));

  if (options.short) {
    return titleLine.replace(/^`|`$/g, "").trim();
  }

  if (options.detailed) {
    return [titleLine, ...bulletLines].join("\n").trim();
  }

  if (bulletLines.length) {
    return [titleLine, ...bulletLines].join("\n").trim();
  }

  return titleLine.trim();
}

export async function generateCommitMessage(diff, options = {}) {
  const { provider, apiKey } = await getAiConfig();
  const client = createClient(provider, apiKey);
  const model = getModelForProvider(provider);
  const instruction = buildStyleInstructions(options);

  const response = await client.responses.create({
    model,
    temperature: 0,
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

  const text = cleanGeneratedMessage(response.output_text || "", options);
  if (!text) {
    throw new Error("AI returned an empty commit message.");
  }
  return text;
}
