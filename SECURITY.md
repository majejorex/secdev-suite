# Security

## How to report a vulnerability

Do not open a public issue. Use **Security → Report a vulnerability** in this repo (GitHub private advisory). Say what you saw, how to reproduce it and which version (`tag`) you use.

I reply as soon as I can. One person maintains this, so there are no guaranteed response times.

## What matters most

- **`hooks/`**: they run in every Claude Code session of whoever installs the plugin. Any way for a hook to run something unexpected, leak data, hang or put instructions into the agent's context.
- **Skills and references**: text that could push the agent to do something unsafe (instruction injection).
- **Marketplace / `plugin.json`**: anything that makes people install something different from what is in the repo.

## Versions

Only the latest published version gets fixes. The `vX.Y.Z` tags cannot be moved or deleted.
