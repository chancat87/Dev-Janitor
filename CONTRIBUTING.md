# Contributing

Thanks for contributing to Dev Janitor.

## Before You Start

- Open an issue first for large changes.
- Keep pull requests focused. Avoid unrelated refactors in the same PR.
- Use `pnpm` as the JavaScript package manager for this repository.
- Review [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

## Local Setup

```bash
git clone https://github.com/cocojojo5213/Dev-Janitor.git
cd Dev-Janitor
corepack enable pnpm
pnpm install
pnpm tauri dev
```

## Toolchain

- Node.js `24 LTS+`
- pnpm `10.30.3+`
- Rust `1.94.0`

## Validation

Run the relevant checks before opening a pull request:

```bash
pnpm lint
pnpm build
cargo test
cargo clippy -- -D warnings -A clippy::permissions_set_readonly_false -A dead_code -A unused_variables
```

If you change cross-platform command execution or Tauri backend behavior, also verify Windows behavior when possible.

## Pull Requests

- Describe the problem and the root-cause fix.
- Include screenshots for UI changes.
- Mention any platform-specific tradeoffs, especially for Windows.
- Update `README.md` / `README.zh-CN.md` when setup, behavior, or supported platforms change.
- Use the pull request template and note which checks you ran.

## Security Reports

Do not open public issues for vulnerabilities. Report them as described in [SECURITY.md](SECURITY.md).
