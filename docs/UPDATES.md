# 工具与包更新

Dev Janitor 的 AI CLI 页面管理工具本体；包管理页面管理各包管理器列出的已安装包。点击更新会在后台执行命令，失败时保留命令的错误信息。

## 常用 AI Agent CLI

以下是当前应用使用的更新命令。命令需要对应工具或包管理器已经安装；npm 安装的工具使用当前 npm 全局目录。

| 工具 | 更新命令 |
| --- | --- |
| Claude Code | `claude update`（失败时尝试 npm 旧版包） |
| Codex | `npm install -g @openai/codex@latest` |
| Gemini CLI | `npm install -g @google/gemini-cli@latest` |
| GitHub Copilot CLI | `npm install -g @github/copilot@latest` |
| Qwen Code | `npm install -g @qwen-code/qwen-code@latest` |
| Cline | `npm install -g cline@latest` |
| OpenCode | `opencode upgrade`（失败时尝试 npm 包） |
| Auggie | `auggie upgrade --skip-confirmation` |
| Kilo | `kilo upgrade` |
| Kiro CLI | `kiro-cli update --non-interactive` |
| Aider | `aider --upgrade` |
| OpenHands | `uv tool upgrade openhands --python 3.12`（Windows 请在 WSL 中运行） |
| Mistral Vibe | `uv tool upgrade mistral-vibe` |
| Factory Droid | `droid update` |
| Qoder | `qodercli update` |
| Pi | `npm install -g --ignore-scripts @earendil-works/pi-coding-agent@latest` |

Pi 的旧包 `@mariozechner/pi-coding-agent` 已弃用。新安装使用 `@earendil-works/pi-coding-agent`；如果旧包占用了 `pi` 可执行文件导致 npm 报 `EEXIST`，先通过原包管理器卸载旧包，再安装新包。应用不会用 `--force` 覆盖其他来源的可执行文件。卸载 npm 包会保留 `~/.pi/agent` 中的配置和会话。

当前 Pi 也支持 `pi update --self` 更新工具本体、`pi update --extensions` 更新扩展包、`pi update --models` 刷新模型目录；这些扩展和模型操作需要在终端中单独运行。

通过 Homebrew、pnpm、系统包管理器或独立安装器安装的工具，应使用原安装渠道更新。AI CLI 页的 npm 命令不能保证替换其他渠道安装的可执行文件。

## 包管理页面

| 包管理器 | 更新单个包 | 说明 |
| --- | --- | --- |
| npm | `npm install -g <包名>@latest` | 显式选择 latest，允许跨主版本更新 |
| pnpm | `pnpm update -g --latest <包名>` | 不受旧版本范围限制 |
| Yarn Classic | `yarn global add --non-interactive <包名>@latest` | 仅 Yarn 1 支持 global；Yarn 2+ 不作为全局包管理器扫描 |
| pip | `python3 -m pip install --upgrade --no-input <包名>` | 实际执行时复用扫描所选的 Python/pip；Windows 优先 `py -m pip` |
| Cargo | `cargo install <包名> --locked` | 更新 crates.io 工具，已安装最新版时避免强制重编译；Git/path 来源请使用原安装命令 |
| Composer | `composer global update --no-interaction <包名>` | 遵循已有 Composer 依赖约束 |
| Homebrew | `brew upgrade <包名>` | 当前页面管理 formula |
| Conda | `conda update -y <包名>` | 操作当前 Conda 环境并遵循其约束 |

包状态分为：

- **有更新**：版本检查发现更新。
- **最新**：版本检查成功，未报告该包过期。
- **未检查更新**：未执行联网检查，或检查失败、超时、返回了无法解析的结果。仍可点击更新，让包管理器决定可安装版本。

npm、pnpm 和 Homebrew 在扫描时检查更新；pip、Cargo、Composer 和 Yarn 等只枚举本地包。扫描命令保留 30 秒限制；包安装、更新、卸载允许执行最多 15 分钟，超时后会尝试终止进程树。错误信息中会保留权限不足、网络失败、Python externally-managed-environment 等原因，不会自动提升权限或绕过 Python 环境保护。

## 资料来源

- [Codex 官方安装与更新](https://developers.openai.com/codex/cli)
- [npm update 的版本范围行为](https://docs.npmjs.com/cli/v11/commands/npm-update/)
- [pnpm update 与 --latest](https://pnpm.io/cli/update)
- [Pi 官方项目](https://github.com/earendil-works/pi)

`pnpm validate:ai-catalog --network` 检查目录中的官方文档和 registry 地址是否可访问；它不能代替各平台上的真实安装、更新和卸载测试。
