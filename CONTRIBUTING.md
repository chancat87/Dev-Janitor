# Contributing

Thanks for contributing to Dev Janitor.

## Before you start

- Open an issue or discussion first for large changes.
- Keep changes focused. Avoid unrelated refactors in the same PR.
- Use `pnpm` as the only JavaScript package manager for this repository.

## Local setup

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

Run the relevant checks before opening a PR:

```bash
pnpm lint
pnpm build
cargo test
cargo clippy -- -D warnings -A clippy::permissions_set_readonly_false -A dead_code -A unused_variables
```

If you change cross-platform command execution or Tauri backend behavior, also verify Windows behavior when possible.

## Pull requests

- Describe the problem and the root-cause fix.
- Include screenshots for UI changes.
- Mention any platform-specific tradeoffs, especially for Windows.
- Update `README.md` / `README.zh-CN.md` when setup, behavior, or supported platforms change.
