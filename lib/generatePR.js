import { getAiConfig } from "./config.js";
import { createClient, getModelForProvider } from "./provider.js";

export async function generatePR({ baseBranch, targetBranch, diff, commits }) {
  const { provider, apiKey } = await getAiConfig();
  const client = createClient(provider, apiKey);
  const model = getModelForProvider(provider);

  const response = await client.responses.create({
    model,
    temperature: 0,
    input: [
      {
        role: "system",
        content:
          "You are generating a pull request description for a software project.",
      },
      {
        role: "user",
        content: `Generate a pull request description using the branch context below.

Base branch: ${baseBranch}
Target branch: ${targetBranch}

STRICT RULES:
- Be concise and structured
- Avoid generic phrases
- Focus on intent and impact
- Do NOT include meta explanations
- Infer high-level purpose from commit messages
- Group related changes logically

Output markdown with EXACT sections in this order:
## Summary
## Changes
## Impact
## Notes

Section guidance:
- Summary: what this change does in 1-2 sentences
- Changes: grouped bullet points of key changes
- Impact: what areas are affected and why it matters
- Notes: edge cases, assumptions, or important context

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
