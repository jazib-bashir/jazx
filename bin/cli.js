#!/usr/bin/env node

import { Command } from "commander";
import { getPRContext, getStagedDiff, resolvePRBranches } from "../lib/getDiff.js";
import { getFilteredAnalysisContext } from "../lib/getFilteredDiff.js";
import { getSinceAnalysisContext } from "../lib/getSinceDiff.js";
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

function renderError(error, commandName) {
  const rawMessage = error?.message || "Unknown error";
  const message = String(rawMessage);

  if (message.includes("No API key found")) {
    return [
      "❌ No API key found.",
      "",
      "Run one of:",
      "  jazx config set-key <your-key>",
      "  export GROQ_API_KEY=\"...\"",
      "  export OPENAI_API_KEY=\"...\"",
    ].join("\n");
  }

  if (message.includes("Cannot use --short and --detailed together")) {
    return "❌ Invalid options: use either --short or --detailed, not both.";
  }

  if (message.includes("No staged changes found")) {
    return [
      "❌ No staged changes found.",
      "",
      "Stage files first:",
      "  git add <files>",
      "Then run:",
      "  jazx commit",
    ].join("\n");
  }

  if (message.includes("Use both --from and --to together")) {
    return "❌ Invalid branch options: provide both --from and --to, or neither.";
  }

  if (message.includes("Base and target branches are the same")) {
    return [
      "❌ Base and target branches resolve to the same branch.",
      "",
      "Use explicit branches, for example:",
      "  jazx pr --from main --to feature/my-branch",
      "  jazx review --from main --to feature/my-branch",
      "  jazx summarize --from main --to feature/my-branch",
    ].join("\n");
  }

  if (message.includes("No branch changes found")) {
    return [
      "❌ No branch changes found between the selected branches.",
      "",
      "Verify branch range and commits, for example:",
      `  jazx ${commandName} --from main --to feature/my-branch`,
    ].join("\n");
  }

  if (message.includes("No matching files found")) {
    return "❌ No matching files found.";
  }

  if (message.includes("No relevant changes found")) {
    return "❌ No relevant changes found.";
  }

  if (message.includes("No changes found in the given time range")) {
    return "❌ No changes found in the given time range.";
  }

  if (message.includes("Invalid --since format")) {
    return "❌ Invalid --since format. Use 1d, 2d, 1w, or 3w.";
  }

  if (message.includes("Invalid provider")) {
    return "❌ Invalid provider. Allowed values: groq, openai.";
  }

  if (message.includes("Failed to detect current branch")) {
    return [
      "❌ Could not detect current git branch.",
      "",
      "Make sure you are inside a git repository and on a branch.",
    ].join("\n");
  }

  if (message.includes("Git is not installed")) {
    return "❌ Git is not installed or not available in PATH.";
  }

  if (message.includes("not a git repository")) {
    return "❌ Current directory is not a git repository.";
  }

  return `❌ ${message}`;
}

function handleCommandError(error, commandName) {
  console.error(`\n${renderError(error, commandName)}`);
  process.exit(1);
}

function createLoader(text) {
  const frames = ["|", "/", "-", "\\"];
  let frameIndex = 0;
  let timer = null;
  const stream = process.stdout;
  const isTTY = Boolean(stream.isTTY);

  return {
    start() {
      if (!isTTY) {
        return;
      }
      stream.write(`\n${frames[0]} ${text}`);
      timer = setInterval(() => {
        frameIndex = (frameIndex + 1) % frames.length;
        stream.write(`\r${frames[frameIndex]} ${text}`);
      }, 100);
    },
    stop(doneText) {
      if (!isTTY) {
        if (doneText) {
          console.log(`\n${doneText}`);
        }
        return;
      }
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      stream.write("\r");
      stream.clearLine(0);
      stream.cursorTo(0);
      if (doneText) {
        stream.write(`${doneText}\n`);
      }
    },
  };
}

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
    const loader = createLoader("Generating commit message...");
    try {
      if (options.short && options.detailed) {
        throw new Error("Cannot use --short and --detailed together.");
      }

      loader.start();
      const diff = await getStagedDiff();
      const message = await generateCommitMessage(diff, options);
      loader.stop("✅ Commit message generated.");

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
      loader.stop();
      handleCommandError(error, "commit");
    }
  });

program
  .command("pr")
  .description("Generate PR description from branch differences")
  .option("--checklist", "Append standard PR checklist")
  .option("--from <baseBranch>", "Base branch (e.g. develop)")
  .option("--to <targetBranch>", "Target branch (e.g. feature/my-change)")
  .action(async (options) => {
    const loader = createLoader("Generating PR description...");
    try {
      loader.start();
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
      loader.stop("✅ PR description generated.");
      console.log("\nGenerated PR description:\n");
      console.log(output);
    } catch (error) {
      loader.stop();
      handleCommandError(error, "pr");
    }
  });

program
  .command("review")
  .description("Generate branch review with risks and improvements")
  .option("--from <baseBranch>", "Base branch (e.g. develop)")
  .option("--to <targetBranch>", "Target branch (e.g. feature/my-change)")
  .option("--files <patterns>", "Comma-separated file patterns (e.g. src/**,api/**)")
  .option("--staged", "Use staged diff instead of branch diff")
  .option("--since <time>", "Filter by recent time window (e.g. 2d, 1w)")
  .action(async (options) => {
    const loader = createLoader("Generating review...");
    try {
      loader.start();
      let baseBranch = "staged";
      let targetBranch = "index";
      let diff = "";
      let commits = "";
      if (options.staged) {
        ({ diff, commits } = await getFilteredAnalysisContext({
          staged: true,
          baseBranch,
          targetBranch,
          files: options.files,
        }));
      } else if (options.since) {
        baseBranch = `since ${options.since}`;
        targetBranch = "now";
        ({ diff, commits } = await getSinceAnalysisContext({
          since: options.since,
          files: options.files,
        }));
      } else {
        ({ baseBranch, targetBranch } = await resolvePRBranches(
          options.from,
          options.to
        ));
        ({ diff, commits } = await getFilteredAnalysisContext({
          staged: false,
          baseBranch,
          targetBranch,
          files: options.files,
        }));
      }
      const output = await generateReview({
        baseBranch,
        targetBranch,
        diff,
        commits,
      });
      loader.stop("✅ Review generated.");
      console.log("\nGenerated review:\n");
      console.log(output);
    } catch (error) {
      loader.stop();
      handleCommandError(error, "review");
    }
  });

program
  .command("summarize")
  .description("Generate concise branch summary")
  .option("--from <baseBranch>", "Base branch (e.g. develop)")
  .option("--to <targetBranch>", "Target branch (e.g. feature/my-change)")
  .option("--files <patterns>", "Comma-separated file patterns (e.g. src/**,api/**)")
  .option("--staged", "Use staged diff instead of branch diff")
  .option("--since <time>", "Filter by recent time window (e.g. 2d, 1w)")
  .action(async (options) => {
    const loader = createLoader("Generating summary...");
    try {
      loader.start();
      let baseBranch = "staged";
      let targetBranch = "index";
      let diff = "";
      let commits = "";
      if (options.staged) {
        ({ diff, commits } = await getFilteredAnalysisContext({
          staged: true,
          baseBranch,
          targetBranch,
          files: options.files,
        }));
      } else if (options.since) {
        baseBranch = `since ${options.since}`;
        targetBranch = "now";
        ({ diff, commits } = await getSinceAnalysisContext({
          since: options.since,
          files: options.files,
        }));
      } else {
        ({ baseBranch, targetBranch } = await resolvePRBranches(
          options.from,
          options.to
        ));
        ({ diff, commits } = await getFilteredAnalysisContext({
          staged: false,
          baseBranch,
          targetBranch,
          files: options.files,
        }));
      }
      const output = await generateSummary({
        baseBranch,
        targetBranch,
        diff,
        commits,
      });
      loader.stop("✅ Summary generated.");
      console.log("\nGenerated summary:\n");
      console.log(output);
    } catch (error) {
      loader.stop();
      handleCommandError(error, "summarize");
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
      handleCommandError(error, "config set-key");
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
      handleCommandError(error, "config set-provider");
    }
  });

program.parseAsync(process.argv).catch((error) => {
  handleCommandError(error, "jazx");
});
