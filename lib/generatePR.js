import { getAiConfig } from "./config.js";
import { createClient, getModelForProvider } from "./provider.js";

export async function generatePR({ baseBranch, targetBranch, diff, commits }) {
  const { provider, apiKey } = await getAiConfig();
  const client = createClient(provider, apiKey);
  const model = getModelForProvider(provider);

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You write concise, high-quality pull request descriptions for software teams.",
      },
      {
        role: "user",
        content: `Generate a pull request description using the branch context below.

Base branch: ${baseBranch}
Target branch: ${targetBranch}

Explain the commits involved, summarize the overall change set, and provide likely impact.

Output markdown with EXACT sections in this order:
## Summary
## Changes
## Impact
## Notes

Commits:
${commits || "(no commit list available)"}

Diff:
${diff || "(no diff available)"}`,
      },
    ],
  });

  const text = (response.output_text || "").trim();
  if (!text) {
    throw new Error("AI returned an empty PR description.");
  }
  return text;
}
