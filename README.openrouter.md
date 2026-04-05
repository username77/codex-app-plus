# OpenRouter Usage

This project includes a small OpenRouter setup for Codex CLI and Codex App Plus on Windows.

## What is included

- `openrouter.bat`
  - Starts `codex` with `model_provider="openrouter"`
  - Accepts a model ID as the first argument
- `openrouter-csharp.bat`
  - Preset for `anthropic/claude-sonnet-4.6`
- `openrouter-php.bat`
  - Preset for `deepseek/deepseek-v3.2`
- `scripts/openrouter-models.ps1`
  - Downloads the current OpenRouter model list

## Requirements

- A working local `codex` installation on `PATH`
- A valid OpenRouter API key
- A configured OpenRouter provider in Codex config

## 1. Configure the OpenRouter provider

Create or update `~/.codex/config.toml`:

```toml
model_provider = "openrouter"
model = "deepseek/deepseek-v3.2"

[model_providers.openrouter]
name = "OpenRouter"
base_url = "https://openrouter.ai/api/v1"
wire_api = "responses"
requires_openai_auth = false
```

Project note:
This app currently writes API keys into `auth.json` under `OPENAI_API_KEY`, and `openrouter.bat` also maps `OPENROUTER_API_KEY` to `OPENAI_API_KEY` automatically. That keeps OpenRouter working with the current desktop integration.

## 2. Set the API key

In `cmd.exe`:

```bat
set OPENROUTER_API_KEY=sk-or-...
```

In PowerShell:

```powershell
$env:OPENROUTER_API_KEY = "sk-or-..."
```

## 3. Start Codex with OpenRouter

Use the generic launcher:

```bat
openrouter.bat
openrouter.bat deepseek/deepseek-v3.2
openrouter.bat openai/gpt-5-codex
```

Use the coding presets:

```bat
openrouter-csharp.bat
openrouter-php.bat
```

You can still pass normal Codex arguments:

```bat
openrouter-csharp.bat --approval-mode never
openrouter-php.bat --sandbox workspace-write
```

## 4. Use OpenRouter in the desktop app

1. Start the app.
2. Open `Settings`.
3. Open the Codex provider section.
4. Apply or select the `openrouter` provider.
5. Return to the composer.
6. Open the model picker.

When the active provider points to OpenRouter, the app tries to fetch the live model list from OpenRouter and merges it into the picker. If the network request fails, it falls back to a local cache.

## 5. Download the latest model list

From PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\openrouter-models.ps1 -WriteTextList
```

Generated files:

- `dist/openrouter-models.json`
- `dist/openrouter-models.txt`

## Recommended model presets

For C#:

- `anthropic/claude-sonnet-4.6`
- `anthropic/claude-opus-4.6`
- `openai/gpt-5-codex`

For PHP:

- `deepseek/deepseek-v3.2`
- `anthropic/claude-sonnet-4.6`
- `google/gemini-3-flash-preview`

Budget or free options:

- `qwen/qwen3.6-plus`
- `qwen/qwen3.6-plus-preview`

## Troubleshooting

If `openrouter.bat` prints a missing key error:

- make sure `OPENROUTER_API_KEY` or `OPENAI_API_KEY` is set

If the desktop app still shows the default Codex models only:

- make sure the active provider is really `openrouter`
- or make sure the provider `base_url` is `https://openrouter.ai/api/v1`
- then reopen the model picker or restart the app

If a model fails at runtime:

- verify the exact model ID on OpenRouter
- check whether the model is still available on your account/provider route
- try another model from the downloaded list

## References

- [OpenRouter models](https://openrouter.ai/models)
- [OpenRouter rankings](https://openrouter.ai/rankings)
- [OpenRouter coding collection](https://openrouter.ai/collections/programming)
- [OpenRouter Codex CLI guide](https://openrouter.ai/docs/guides/coding-agents/codex-cli)
