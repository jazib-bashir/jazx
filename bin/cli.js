#!/usr/bin/env node

import { Command } from "commander";
import { getStagedDiff } from "../lib/getDiff.js";
import { generateCommitMessage } from "../lib/generateCommit.js";
import { applyCommitMessage, confirmApply } from "../lib/applyCommit.js";
import { setApiKey, setProvider } from "../lib/config.js";

const program = new Command();

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
