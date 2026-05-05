# jazx

AI-powered git commit message generator for staged changes.

`jazx` reads your staged diff, asks OpenAI to generate a high-quality commit message, and optionally applies it with `git commit -m`.

## Features

- Generate commit messages from `git diff --staged`
- Smart output mode (title + optional bullets)
- Strict Conventional Commits mode
- Force commit type (`feat`, `fix`, `chore`, etc.)
- Optional one-line or detailed output styles
- Optional confirmation + auto-apply commit flow

## Requirements

- Node.js 18+
- Git installed and available in `PATH`
- OpenAI API key via `OPENAI_API_KEY` or `jazx config set-key`

## Installation

### Global (recommended for CLI usage)

```bash
npm install -g jazx
```

### Local project usage

```bash
npm install jazx
```

Then run with:

```bash
npx jazx commit
```

## Setup

You can provide your OpenAI key in either way:

1. Environment variable:

```bash
export OPENAI_API_KEY="your_openai_api_key"
```

2. Local jazx config (recommended):

```bash
jazx config set-key sk-...
```

This stores your key in `~/.jazx/config.json`.

## Usage

```bash
jazx commit [options]
```

```bash
jazx config set-key <apiKey>
```

### Config Command

Use this once to save your API key locally:

```bash
jazx config set-key sk-abc123
```

Key is stored at `~/.jazx/config.json`.

### Options

- `--apply`  
  Apply the generated message using `git commit -m` (with confirmation prompt).

- `--type <type>`  
  Force commit type (for example: `feat`, `fix`, `chore`, `docs`, `refactor`).

- `--conventional`  
  Enforce Conventional Commits format: `type(scope): message` (or `type: message`).

- `--short`  
  Generate only a one-line commit title.

- `--detailed`  
  Always generate title + bullet points.

## Behavior Rules

- Default mode: smart (title + optional bullets when useful)
- `--short`: always one line only
- `--detailed`: always includes bullets
- `--type`: overrides AI-selected type
- `--short` + `--detailed`: throws an error
- If no staged changes exist: exits with error

## Examples

| Use Case | Command |
| --- | --- |
| Save API key locally | `jazx config set-key sk-abc123` |
| Generate message only | `jazx commit` |
| Generate strict conventional one-liner | `jazx commit --conventional --short` |
| Force type and generate detailed output | `jazx commit --type feat --detailed` |
| Generate and apply commit | `jazx commit --apply` |

## Example Output

```text
feat(auth): add token refresh handling

* implement refresh token logic
* handle expired sessions
* update middleware validation
```

## Notes

- Commit title is prompted to stay under 72 characters.
- Generic messages like "update code" are discouraged by prompt rules.
- Commit message application is safe with quote handling (no shell interpolation).

## Troubleshooting

- **OpenAI API key not found**  
  Set `OPENAI_API_KEY` or run:

  ```bash
  jazx config set-key <apiKey>
  ```

- **No staged changes found**  
  Stage files first:

  ```bash
  git add <files>
  ```

## Quick Test (End-to-End)

```bash
# 1) Install dependencies
npm install

# 2) Save your key once (or use OPENAI_API_KEY env var)
node bin/cli.js config set-key sk-abc123

# 3) Create a small test change
echo "// jazx test" >> test.txt
git add test.txt

# 4) Generate a commit message
node bin/cli.js commit --conventional

# 5) Apply commit with confirmation prompt
node bin/cli.js commit --apply
```

## License

ISC
