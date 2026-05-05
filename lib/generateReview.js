import { getAiConfig } from "./config.js";
import { createClient, getModelForProvider } from "./provider.js";

export async function generateReview({ baseBranch, targetBranch, diff, commits }) {
  const { provider, apiKey } = await getAiConfig();
  const client = createClient(provider, apiKey);
  const model = getModelForProvider(provider);

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are a pragmatic senior engineer focused on finding real software risks.",
      },
      {
        role: "user",
        content: `Review the branch changes below and produce actionable review notes.

Base branch: ${baseBranch}
Target branch: ${targetBranch}

Rules:
- Focus on real risks and meaningful improvements
- Avoid generic advice
- Be concise and actionable
- Do not include any text outside the required sections

Output markdown with EXACT sections in this order:
## Potential Issues
## Improvements
## Risk Areas
## Test Suggestions

Commits:
${commits || "(no commit list available)"}

Diff:
${diff || "(no diff available)"}`,
      },
    ],
  });

  const text = (response.output_text || "").trim();
  if (!text) {
    throw new Error("AI returned an empty review output.");
  }
  return text;
}
