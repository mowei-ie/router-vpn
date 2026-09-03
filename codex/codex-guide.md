# 认识 OpenAI Codex：入口、登录与工具边界

Codex 是 OpenAI 面向软件开发的 Agent。和只回答“这段代码是什么意思”的聊天助手不同，它可以在获得上下文与权限后，读取仓库、编辑文件、执行构建或测试命令，并把结果整理成可审阅的改动。它不是无人监管的开发者：任务范围、权限、验证标准和最终交付责任仍在人。

## 先理解“同一个 Agent，多种入口”

Codex 不是单一窗口。不同入口共享核心能力，但运行位置、上下文来源和适合任务并不相同。

### ChatGPT 桌面端中的 Codex

Codex 已进入 Windows 和 macOS 的 ChatGPT 桌面应用。它适合本机项目、可视化 diff、多会话、worktree、Skills、plugins 与定时任务。任务在本机运行时，会受本机 sandbox、approval policy 和项目权限约束。

这不是“普通 ChatGPT 对话框自动获得整台电脑权限”。你需要选择项目，并依据任务授予相应权限。

### Codex Web 与 Cloud

Codex Web 连接 GitHub 仓库后，可以在 OpenAI 管理的隔离环境中执行云端任务并产出 diff 或 pull request。Cloud 会克隆仓库并检出工作分支；它不等于远程控制你的个人电脑。

云环境的 setup 阶段可按环境设置安装依赖；Agent 阶段默认离线，只有显式开启环境网络访问后才能联网。环境 secret 仅在 setup 阶段提供，并在 Agent 阶段开始前移除。不要因此把不必要的生产密钥放入环境。

### Codex CLI

CLI 在终端当前目录中工作，适合键盘驱动、本地脚本、代码审阅和非交互自动化。它能调用本机工具，所以目录选择、sandbox 和审批策略很关键。初次使用请从[CLI 快速上手](codex-cli-quickstart.md)开始。

### IDE 扩展

Codex IDE 扩展适合边看代码边提问或修改。它会自动把打开的文件列表和选区作为上下文；CLI 通常需要你明确写出路径，或用文件提及功能附加上下文。

官方 VS Code 扩展也可在 VS Code 的兼容分支（例如 Cursor）中使用，但它是 Codex 扩展，并不会把 Cursor 自身 Agent、计费或规则系统变成 Codex。两套工具可并存。

### iOS 与其他移动入口

ChatGPT 移动应用中的 Remote 可以从 iOS 或 Android 控制一台正在运行 ChatGPT 桌面端的 Windows/macOS 主机；可用性可能分批开放。工作仍在连接的主机上执行。它和 Codex Cloud 是两种机制：Remote 连接本机主机，Cloud 在隔离云环境执行。

移动端更适合查看进度、补充要求和审阅结果，不应因为屏幕较小而省略 diff 与权限检查。

## 两种 OpenAI 登录路径

### 使用 ChatGPT 登录

本地 Codex 首次需要认证时，默认会打开浏览器完成 ChatGPT OAuth。CLI、IDE 扩展和 ChatGPT 桌面端的本地工作支持这种方式。其用量跟随 ChatGPT 方案和工作区权限；企业工作区的 RBAC、保留与数据驻留设置也随该工作区生效。

截至 2026-09-03，官方列出的 ChatGPT 各方案——包括 Free、Go、Plus、Pro、Business、Edu 与 Enterprise——均包含 Codex，但入口、可用模型、额度与云端集成功能会随方案和工作区变化。不要仅凭“方案包含 Codex”推断某项 beta 功能、特定模型或额度一定可用；Codex Cloud、GitHub code review、Slack 等云集成通常还需要符合要求的付费方案或工作区权限。具体以官方定价页和工作区设置为准。

Codex Cloud 必须使用 ChatGPT 登录。GitHub code review、Slack 等依赖 ChatGPT 工作区或云服务的集成功能也属于这一侧，其可用性受方案与工作区权限约束。

### 使用 OpenAI API key

本地 CLI、IDE 扩展和 ChatGPT 桌面端中的本地 Codex 也可使用 OpenAI Platform API key。首次认证时运行 `codex login`，在交互界面选择 API key 方式并按提示输入；不要把 key 写入教程命令历史、仓库或聊天消息。

API key 路径具有三个容易混淆的特点：

- 费用按 OpenAI API 的实际用量和当前 API 价格结算，不消耗 ChatGPT 订阅内含额度。
- 可用模型取决于该 API key 所属组织和项目的 API 权限。
- GitHub code review、Slack 等云端功能不可用；Codex Cloud 也不接受 API key 登录。

API key 的数据处理遵循 API 组织的保留与数据共享设置，而不是 ChatGPT 工作区设置。关于 API 项目、密钥和计费，可继续阅读 [OpenAI API 指南](../chatgpt/openai-api-guide.md)。

## Codex 与相邻产品的边界

### Codex 与 ChatGPT

ChatGPT 是通用 AI 产品与承载界面；Codex 是其中面向代码库和开发工具的软件工程 Agent。普通 ChatGPT 对话适合解释、写作和广泛问答；当任务需要读写仓库、运行测试或形成 diff 时，才进入 Codex 的工作方式。

ChatGPT 订阅包含 Codex 使用权，不等于附赠通用 OpenAI API 调用额度。套餐细节参见 [ChatGPT Plus 指南](../chatgpt/chatgpt-plus-guide.md)。

### Codex 与 OpenAI API

OpenAI API 是供开发者编程调用的服务。Codex 是已经实现了上下文管理、工具执行、sandbox、审批与代码工作流的 Agent 产品。使用 API key 登录 Codex，只是改变认证和计费路径，并不把 Codex 变成你自行编写的 API 应用。

需要把模型嵌入自己的后端、批处理或产品时，使用 API；需要一个现成 Agent 在仓库里完成工程任务时，使用 Codex。

### Codex 与 Cursor

Cursor 是 AI 代码编辑器，拥有自己的 Agent、规则、模型选择、计费与编辑器工作流。Codex IDE 扩展可以安装在兼容的编辑器中，但两者的会话、权限和产品承诺不能互相替代。

选择时看任务环境，而不是只比较聊天效果：

- 已在终端工作，希望用 OpenAI 的本地 Agent：Codex CLI。
- 需要 OpenAI 管理的云任务或 GitHub/Slack 集成：Codex Cloud 及相关集成。
- 工作流围绕 Cursor 编辑器自身 Agent：参考 [Cursor 指南](../cursor/cursor-guide.md)。
- 同时使用两者：为每次任务明确谁可写文件，避免两个 Agent 并发修改同一工作区。

## 选择入口的三个问题

1. **代码在哪里？** 本机未推送改动优先本地 CLI/IDE/桌面端；GitHub 上可复现的独立任务可考虑 Cloud。
2. **任务要调用什么？** 需要本机私有工具就本地运行；需要 Slack 或 GitHub 云集成则使用 ChatGPT 登录支持的云能力。
3. **风险如何隔离？** 小修改可在当前分支处理；长任务、并行任务或自动化优先使用分支/worktree，并保持最小网络和写权限。

## 第一次使用前的底线

- 先备份或确保 Git 工作区可恢复，再让 Agent 编辑。
- 不把 `.env`、token、API key、生产数据粘贴进提示词。
- 提示中写清允许修改的路径、禁止事项与验收命令。
- 审阅实际 diff，而不是只读 Agent 的总结。
- 提交和推送是独立的外部动作；不要假定 Codex 永远会做，也不要让它未经确认自动做。

下一步可进入 [Codex CLI 快速上手](codex-cli-quickstart.md)，或直接学习[可审阅的工程工作流](codex-workflow.md)。

## 官方资料与声明

直接相关官方资料：

- [Codex 汇总手册](https://developers.openai.com/codex/codex-manual.md)
- [认证方式](https://developers.openai.com/codex/auth)
- [Codex 定价与方案](https://developers.openai.com/codex/pricing)
- [Codex Cloud](https://developers.openai.com/codex/cloud)
- [Remote connections](https://developers.openai.com/codex/remote-connections)
- [Codex 更新日志](https://developers.openai.com/codex/changelog)

本文为非官方中文教程，不代表 OpenAI，也未使用 OpenAI logo 或官方截图。内容由 AI 辅助起草；发布前应由维护者依据官方资料完成人工复核。产品能力、额度、价格与分批开放状态可能变化，请以当前官方页面和账户界面为准。

**最后核验：2026-09-03。**
