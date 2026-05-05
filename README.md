# jazx

AI-powered Git assistant for commit messages and PR descriptions.

`jazx` helps you:
- generate high-quality commit messages from staged changes
- generate PR descriptions from branch differences
- optionally append a review checklist for PRs

## Features

- Provider-based AI support: `groq` (default) and `openai`
- Clean commit output (no chatty wrappers, no markdown fences)
- Commit modes: smart, short, detailed, conventional, forced type
- PR generation from `base...head` diff + commit log context
- Optional static checklist append with `jazx pr --checklist`
- Local config at `~/.jazx/config.json`

## Requirements

- Node.js 18+
- Git installed and available in `PATH`
- API key for selected provider

## Installation

### Global install

```bash
npm install -g jazx
```

### Local usage

```bash
npm install jazx
npx jazx --help
```

## Configuration

`jazx` supports two providers:
- `groq` (default model: `llama-3.1-8b-instant`)
- `openai` (default model: `gpt-4o-mini`)

### Config commands

| Command | Description |
| --- | --- |
| `jazx config set-provider groq` | Set provider to Groq |
| `jazx config set-provider openai` | Set provider to OpenAI |
| `jazx config set-key <apiKey>` | Save API key locally |

Saved config file path:
- `~/.jazx/config.json`

Example config:

```json
{
  "provider": "groq",
  "apiKey": "your_api_key"
}
```

### Key resolution priority

1. `~/.jazx/config.json`
2. environment variables:
   - `GROQ_API_KEY`
   - `OPENAI_API_KEY`

## Commands

| Command | Description |
| --- | --- |
| `jazx commit [options]` | Generate commit message from staged changes |
| `jazx pr [options]` | Generate PR description from branch differences |
| `jazx config set-key <apiKey>` | Save API key |
| `jazx config set-provider <provider>` | Set provider (`groq` or `openai`) |

## `jazx commit` options

| Option | Description |
| --- | --- |
| `--apply` | Apply generated message with `git commit -m` (with confirmation prompt) |
| `--type <type>` | Force commit type (`feat`, `fix`, `chore`, etc.) |
| `--conventional` | Enforce conventional commit format |
| `--short` | Generate only one-line title |
| `--detailed` | Generate title + bullet points |
| `--custom <instruction>` | Add custom guidance to generation |

Behavior rules:
- default mode is smart (title + optional bullets)
- `--short` and `--detailed` cannot be used together
- exits with error if there are no staged changes

## `jazx pr` options

| Option | Description |
| --- | --- |
| `--from <baseBranch>` | Base branch for PR diff |
| `--to <targetBranch>` | Target branch for PR diff |
| `--checklist` | Append static checklist section |

Branch behavior:
- if both `--from` and `--to` are provided, those values are used directly
- if neither is provided:
  - head = current branch
  - base = `develop` if it exists, otherwise `main`
- if only one is provided, command fails with helpful error

`jazx pr` uses:
- `git diff base...head`
- `git log base..head --oneline`

AI output is requested in this structure:
- `## Summary`
- `## Changes`
- `## Impact`
- `## Notes`

## Usage examples

### Commit generation

```bash
# one-line conventional
jazx commit --conventional --short

# detailed with forced type
jazx commit --type feat --detailed

# custom style instruction
jazx commit --short --custom "imperative tense, no scope"

# generate + apply
jazx commit --apply
```

### PR generation

```bash
# auto branch detection (develop -> current branch, fallback main)
jazx pr

# explicit branch range
jazx pr --from develop --to feature/my-change

# append checklist
jazx pr --checklist

# explicit branches + checklist
jazx pr --from main --to feature/my-change --checklist
```

## Checklist appended by `--checklist`

When `--checklist` is used, this static section is appended to the AI-generated PR description:

- Development checks
- Security checks
- Network checks
- Code review checks

## Troubleshooting

- **No API key found**
  - run: `jazx config set-key <your-key>`
  - or export `GROQ_API_KEY` / `OPENAI_API_KEY`

- **No staged changes found (commit command)**
  - stage files first: `git add <files>`

- **No branch changes found (pr command)**
  - verify branch range and commits between base and target

## License

ISC
