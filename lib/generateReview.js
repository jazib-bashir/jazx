import { getAiConfig } from "./config.js";
import { createClient, getModelForProvider } from "./provider.js";

export async function generateReview({ baseBranch, targetBranch, diff, commits }) {
  const { provider, apiKey } = await getAiConfig();
  const client = createClient(provider, apiKey);
  const model = getModelForProvider(provider);

  const response = await client.responses.create({
    model,
    temperature: 0,
    input: [
      {
        role: "system",
        content: "You are a senior software engineer performing a code review.",
      },
      {
        role: "user",
        content: `Analyze the provided git diff and commit list.

Base branch: ${baseBranch}
Target branch: ${targetBranch}

STRICT RULES:
- Be specific (reference file names, functions, or patterns if visible)
- Avoid generic advice like "improve code quality"
- Focus on real risks, bugs, and edge cases
- Keep output concise and actionable
- Do NOT include explanations outside sections
- If diff is small, still provide meaningful insights
- Do not say "no issues found"

Output markdown with EXACT sections in this order:
## Potential Issues
## Improvements
## Risk Areas
## Test Suggestions

Section guidance:
- Potential Issues: concrete risks or bugs
- Improvements: specific refactoring suggestions
- Risk Areas: parts of system affected and why
- Test Suggestions: what should be tested and why

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
