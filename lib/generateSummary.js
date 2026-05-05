import { getAiConfig } from "./config.js";
import { createClient, getModelForProvider } from "./provider.js";

export async function generateSummary({ baseBranch, targetBranch, diff, commits }) {
  const { provider, apiKey } = await getAiConfig();
  const client = createClient(provider, apiKey);
  const model = getModelForProvider(provider);

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: "You write concise engineering summaries of code changes.",
      },
      {
        role: "user",
        content: `Summarize this branch in a concise format.

Base branch: ${baseBranch}
Target branch: ${targetBranch}

Rules:
- Summarize the purpose of the branch
- Highlight key changes
- Keep it concise
- Output only: one short paragraph followed by bullet points
- Do not include extra sections or headings

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
