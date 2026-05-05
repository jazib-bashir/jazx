import { getAiConfig } from "./config.js";
import { createClient, getModelForProvider } from "./provider.js";

export async function generateSummary({ baseBranch, targetBranch, diff, commits }) {
  const { provider, apiKey } = await getAiConfig();
  const client = createClient(provider, apiKey);
  const model = getModelForProvider(provider);

  const response = await client.responses.create({
    model,
    temperature: 0,
    input: [
      {
        role: "system",
        content: "You are summarizing a branch's changes for a developer.",
      },
      {
        role: "user",
        content: `Summarize this branch in a developer-friendly format.

Base branch: ${baseBranch}
Target branch: ${targetBranch}

STRICT RULES:
- Keep it concise
- Highlight purpose, not just changes
- Avoid generic wording
- No unnecessary sections
- Infer intent from commit messages
- Avoid repeating the same idea in multiple bullets

Output format:
- One short paragraph describing overall purpose
- Then bullet points for:
  - key changes
  - important additions or updates
- Do not include headings or extra sections

Commits:
${commits || "(no commit list available)"}

Diff:
${diff || "(no diff available)"}`,
      },
    ],
  });

  const text = (response.output_text || "").trim();
  if (!text) {
    throw new Error("AI returned an empty summary output.");
  }
  return text;
}
