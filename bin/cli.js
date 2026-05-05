#!/usr/bin/env node

import { Command } from "commander";
import { getPRContext, getStagedDiff, resolvePRBranches } from "../lib/getDiff.js";
import { generateCommitMessage } from "../lib/generateCommit.js";
import { generatePR } from "../lib/generatePR.js";
import { generateReview } from "../lib/generateReview.js";
import { generateSummary } from "../lib/generateSummary.js";
import { applyCommitMessage, confirmApply } from "../lib/applyCommit.js";
import { setApiKey, setProvider } from "../lib/config.js";

const program = new Command();
const CHECKLIST_SECTION = `---

## Checklist

### Development
- [ ] Lint rules pass locally
- [ ] Application changes have been tested thoroughly
- [ ] Automated tests covering modified code pass

### Security
- [ ] Security impact of change has been considered
- [ ] Code follows company security practices and guidelines

### Network
- [ ] Changes to network configurations have been reviewed
- [ ] Any newly exposed public endpoints or data have gone through security review

### Code Review
- [ ] Pull request has a descriptive title and context useful to a reviewer
- [ ] "Ready for review" label attached and reviewers assigned
- [ ] Changes have been reviewed by at least one other contributor
- [ ] Pull request linked to task tracker where applicable`;

program
  .name("jazx")
  .description("AI-powered commit message generator")
  .version("1.0.0");

program
  .command("commit")
  .description("Generate git commit message from staged changes")
  .option("--apply", "Automatically run git commit -m")
  .option("--type <type>", "Force commit type (feat, fix, chore, etc.)")
  .option("--conventional", "Enforce strict conventional commit format")
  .option("--short", "Generate one-line commit message only")
  .option("--detailed", "Generate title and bullet points")
  .option("--custom <instruction>", "Add custom instruction for generation")
  .action(async (options) => {
    try {
      if (options.short && options.detailed) {
        throw new Error("Cannot use --short and --detailed together.");
      }

      const diff = await getStagedDiff();
      const message = await generateCommitMessage(diff, options);

      console.log("\nGenerated commit message:\n");
      console.log(message);

      if (!options.apply) {
        return;
      }

      const confirmed = await confirmApply(message);
      if (!confirmed) {
        console.log("\nCommit cancelled.");
        process.exit(1);
      }

      await applyCommitMessage(message);
      console.log("\nCommit applied successfully.");
    } catch (error) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("pr")
  .description("Generate PR description from branch differences")
  .option("--checklist", "Append standard PR checklist")
  .option("--from <baseBranch>", "Base branch (e.g. develop)")
  .option("--to <targetBranch>", "Target branch (e.g. feature/my-change)")
  .action(async (options) => {
    try {
      const { baseBranch, targetBranch } = await resolvePRBranches(
        options.from,
        options.to
      );
      const { diff, commits } = await getPRContext(baseBranch, targetBranch);
      let output = await generatePR({
        baseBranch,
        targetBranch,
        diff,
        commits,
      });
      if (options.checklist) {
        output = `${output}\n\n${CHECKLIST_SECTION}`;
      }
      console.log("\nGenerated PR description:\n");
      console.log(output);
    } catch (error) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("review")
  .description("Generate branch review with risks and improvements")
  .option("--from <baseBranch>", "Base branch (e.g. develop)")
  .option("--to <targetBranch>", "Target branch (e.g. feature/my-change)")
  .action(async (options) => {
    try {
      const { baseBranch, targetBranch } = await resolvePRBranches(
        options.from,
        options.to
      );
      const { diff, commits } = await getPRContext(baseBranch, targetBranch);
      const output = await generateReview({
        baseBranch,
        targetBranch,
        diff,
        commits,
      });
      console.log("\nGenerated review:\n");
      console.log(output);
    } catch (error) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("summarize")
  .description("Generate concise branch summary")
  .option("--from <baseBranch>", "Base branch (e.g. develop)")
  .option("--to <targetBranch>", "Target branch (e.g. feature/my-change)")
  .action(async (options) => {
    try {
      const { baseBranch, targetBranch } = await resolvePRBranches(
        options.from,
        options.to
      );
      const { diff, commits } = await getPRContext(baseBranch, targetBranch);
      const output = await generateSummary({
        baseBranch,
        targetBranch,
        diff,
        commits,
      });
      console.log("\nGenerated summary:\n");
      console.log(output);
    } catch (error) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

const configCommand = program.command("config").description("Manage jazx config");

configCommand
  .command("set-key <apiKey>")
  .description("Store API key in ~/.jazx/config.json")
  .action(async (apiKey) => {
    try {
      const { maskedKey } = await setApiKey(apiKey);
      console.log("✅ API key saved successfully");
      console.log(`API key saved: ${maskedKey}`);
    } catch (error) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

configCommand
  .command("set-provider <provider>")
  .description("Set AI provider (groq or openai)")
  .action(async (provider) => {
    try {
      const selected = await setProvider(provider);
      console.log(`✅ Provider set to: ${selected}`);
    } catch (error) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
