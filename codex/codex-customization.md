# Codex 定制指南：指令、配置、技能与自动化

Codex 的定制不是把所有偏好塞进一个超长提示。更稳妥的做法是按职责分层：用 `AGENTS.md` 写项目约束，用 `config.toml` 控制运行策略，用 Skill 封装重复流程，用 MCP 连接外部工具，再按需要引入 plugin、subagent 和 automation。

## 先看职责分工

- **`AGENTS.md`**：告诉 Agent 在这个目录中“应怎样工作”。
- **`config.toml`**：设置模型、sandbox、审批、MCP 与功能开关等运行行为。
- **profile**：为同一用户配置一组可切换的差异值。
- **Skill**：把可重复的多步方法、脚本和参考资料封装成能力。
- **MCP**：让 Codex 调用外部工具或数据源。
- **plugin**：可安装、可分发地打包 Skills、连接器/MCP 映射等能力。
- **subagent**：把一个复杂任务拆给多个独立 Agent 线程或自定义角色。
- **automation**：按时间或周期在后台重复运行已稳定的任务。

它们可以组合，但应从最小层开始：一次性要求留在提示词；长期规则才进 `AGENTS.md`；重复方法才做 Skill；确实需要外部系统才接 MCP。

## 用 AGENTS.md 写持久指令

### 发现与层级

Codex 启动时构建一次指令链，规则如下：

1. **全局层**：在 Codex home（默认 `~/.codex`，可由 `CODEX_HOME` 改变）先找 `AGENTS.override.md`，没有时再找 `AGENTS.md`；只取这一层第一个非空文件。
2. **项目层**：从项目根目录（通常是 Git 根）走到当前工作目录。每一级目录依次找 `AGENTS.override.md`、`AGENTS.md`，再找配置的 fallback 文件名；每级最多取一个。
3. **合并顺序**：从根到当前目录拼接，越靠近当前目录的规则越晚出现，因而能覆盖更上层指导。

空文件会跳过。合计读取量默认最多 **32 KiB**，由 `project_doc_max_bytes` 控制；超过时应优先拆成嵌套目录规则，而不是不断扩大一个根文件。

`AGENTS.override.md` 适合临时或本地覆盖，例如在个人环境中暂时禁止部署。它的优先级高，也更容易造成“为什么规则没生效”的困惑；排查时应同时检查全局和沿路径的 override 文件。

### 最小项目示例

仓库根目录的 `AGENTS.md`：

```md
# 仓库协作约定

- 默认使用简体中文更新文档。
- 修改前先列出目标文件；不要顺手重排无关章节。
- 相对链接必须指向仓库内存在的文件或标题锚点。
- 完成后运行仓库现有的 Markdown 检查。
- 未经明确要求，不执行 git commit 或 git push。
```

嵌套目录 `docs/api/AGENTS.override.md` 可以收窄该区域：

```md
# API 文档临时规则

- 当前只允许修正链接和拼写，不改变接口语义。
- 遇到版本差异时停止编辑并列出待维护者确认的问题。
```

把可验证的项目行为写进去；不要写密钥，不要用“永远正确”“全自动发布”这类无法兑现的要求。

## 用 config.toml 控制运行

### 配置位置与优先级

个人默认值位于 `~/.codex/config.toml`（Windows 原生通常对应 `%USERPROFILE%\.codex\config.toml`）。项目可在 `.codex/config.toml` 放置覆盖层；只有信任该项目时，Codex 才加载项目 `.codex/` 配置。

当前官方优先级从高到低为：

1. CLI flags 与 `--config` 临时覆盖；
2. 从项目根到当前目录的 `.codex/config.toml`，越近者优先；
3. `--profile` 选中的 profile 文件；
4. 用户级 `~/.codex/config.toml`；
5. 系统级配置（若存在）；
6. 内置默认值。

项目配置不能覆盖认证、provider、profile 选择、通知和遥测等一组机器/用户敏感键。不要把个人 API endpoint 或凭据策略提交到项目配置。

### 一个保守的最小配置

```toml
#:schema https://developers.openai.com/codex/config-schema.json

approval_policy = "on-request"
sandbox_mode = "workspace-write"
project_doc_max_bytes = 32768

[sandbox_workspace_write]
network_access = false
```

这些键均来自官方配置参考：

- `approval_policy = "on-request"`：默认在 sandbox 内工作，需要越界时请求批准。
- `sandbox_mode = "workspace-write"`：允许写活动工作区，不等于整机完全访问。
- `project_doc_max_bytes`：项目指令读取上限。
- `sandbox_workspace_write.network_access = false`：不允许 workspace-write sandbox 内命令访问外网。

编辑后可启动新会话并用 `/status` 核对实际状态。不要从第三方片段复制陌生键；先查[配置参考](https://developers.openai.com/codex/config-reference)和当前版本 schema。

## 用 profiles 切换场景

当前版本的 profile 是 `$CODEX_HOME` 下的独立文件，不再推荐在 `config.toml` 里写旧式 `[profiles.name]` 表。

例如保留上述用户默认配置，再创建 `~/.codex/audit.config.toml`：

```toml
sandbox_mode = "read-only"
approval_policy = "on-request"
```

启动：

```powershell
codex --profile audit
```

profile 覆盖用户基础配置，但仍会被项目配置和 CLI 临时参数覆盖。让 profile 只保存差异项，名称用字母、数字、连字符或下划线。项目 `.codex/config.toml` 不能替你选择 profile。

## 用 Skills 封装重复流程

Skill 是一个含 `SKILL.md` 的目录，可附带 `scripts/`、参考资料和资源。Codex 首先只加载 Skill 的名称、描述和路径，选中后才读取完整内容，这种渐进加载可避免把所有工作流都塞进初始上下文。

常用位置：

- 个人：`$HOME/.agents/skills/<skill-name>/SKILL.md`
- 仓库：从当前目录到仓库根沿途的 `.agents/skills/<skill-name>/SKILL.md`

最小的 `.agents/skills/check-doc-links/SKILL.md`：

```md
---
name: check-doc-links
description: 检查并修复 Markdown 相对链接；用户要求文档链接审计时使用。
---

# 文档链接检查

1. 列出本次允许修改的 Markdown 文件。
2. 解析相对文件链接和标题锚点，不改写无法验证的外部 URL。
3. 只修复能从仓库确定目标的错误。
4. 运行仓库现有 Markdown 检查并展示 diff。
5. 不提交或推送。
```

Skill 的 `name` 与 `description` 是必需元数据。描述应同时写“做什么”和“何时用”，这样显式调用和自动匹配都更可靠。Skills 可用于 CLI、IDE 扩展和 ChatGPT 桌面端中的 Codex。

若要暂时禁用某个已发现 Skill，可按官方配置格式写：

```toml
[[skills.config]]
path = "/absolute/path/to/check-doc-links/SKILL.md"
enabled = false
```

Windows 使用对应的绝对路径。不要删除团队 Skill 来表达个人偏好，优先用用户配置禁用。

## 用 MCP 连接外部工具

MCP server 给 Codex 暴露工具和资源，例如官方文档、工单系统或数据库查询接口。它解决“如何访问系统”，不负责定义完整工作流程；流程仍适合放在 Skill 或任务提示中。

远程 HTTP server 的最小配置形式：

```toml
[mcp_servers.openai_docs]
url = "https://developers.openai.com/mcp"
```

管理前先查看实时帮助：

```powershell
codex mcp --help
codex mcp list
```

交互会话中的 `/mcp` 用于查看已经配置的 MCP 工具。当前 `codex mcp` 子命令在官方 CLI 参考中仍标为 experimental，参数可能变化。

接入前检查：

- server 的运营者和传输方式；
- 它能读哪些数据、能执行哪些副作用操作；
- OAuth/token 存储位置与撤销方式；
- 工具输出是否可能包含提示注入或不可信内容；
- sandbox 和审批是否足以限制后续动作。

不要在项目 `config.toml` 或 `AGENTS.md` 明文放 token。

## Plugins：安装与分发单元

Skill 是工作流的创作格式；plugin 是供他人安装和分发的单元。plugin 可包含一个或多个 Skills，也可打包连接器、MCP 映射和展示资源。先在本地 Skill 中迭代，稳定后再做 plugin，避免一开始就承担分发与兼容成本。

截至核验日，plugins 可在 ChatGPT Work Web、ChatGPT 桌面端的 Work/Codex 以及 Codex CLI 的 plugin 浏览器中使用；不适用于普通 Chat、IDE 扩展或移动端。CLI 的 `codex plugin` 与 marketplace 子命令仍标为 experimental，应以当前帮助为准。

安装第三方 plugin 等同于引入新的指令和外部工具能力。阅读权限与来源，创建新会话使其加载，再用低风险任务验证。

## Subagents：拆任务，不是复制权限

Subagent 适合并行调查、测试或独立审阅。每个 subagent 都会产生自己的模型与工具开销；Codex 只在你明确要求时生成 subagents。

自定义角色可放在：

- 个人：`~/.codex/agents/<role>.toml`
- 项目：`.codex/agents/<role>.toml`

最小只读文档审阅角色：

```toml
name = "docs_reviewer"
description = "只读检查 Markdown 的结构、相对链接和风险表述。"
sandbox_mode = "read-only"
```

角色文件是 spawned session 的配置层，省略的模型、MCP、Skills 等设置可从父会话继承。让多个 subagents 同时写同一文件会增加冲突；更稳妥的分工是“一人调查、一人审阅、主 Agent 统一编辑”。

## Automations：只自动化已稳定流程

ChatGPT 桌面端可创建 scheduled tasks，在后台按周期运行。可选择项目、提示、频率，以及在本地项目或独立 Git worktree 中执行；本地文件任务要求电脑保持开启且应用运行。

适合的例子：每周运行“检查新增 Markdown 的相对链接”，无发现时归档结果，有发现时进入 inbox 等待人工处理。它可以显式调用前面的 `check-doc-links` Skill。

启用前确认：

- 任务已经手动成功运行多次；
- 默认 sandbox 足够严格；
- Git 仓库使用独立 worktree，避免覆盖正在编辑的文件；
- 后台任务不依赖交互式审批或长期密钥；
- 有人定期审阅、暂停和清理历史运行。

Automation 不是 CI 的替代品，也不应默认提交、推送或发布。若选择直接在本地项目运行，它可以修改你正在编辑的文件；隔离 worktree 通常更安全。

## 一种推荐组合

以“每周文档链接检查”为例：

1. `AGENTS.md` 规定文档风格、允许范围和不得自动提交。
2. `config.toml` 使用 `workspace-write`、`on-request`，默认关闭网络。
3. `check-doc-links` Skill 固化解析、修复、验证和 diff 输出步骤。
4. 只有需要查询权威外部文档时，才配置受信任的 MCP。
5. 可选只读 `docs_reviewer` subagent 做独立复核。
6. 手动跑稳定后，在桌面端创建 worktree automation。
7. 人从 inbox 审阅结果，再决定是否建立分支、提交和 PR。

每层只承担一种职责，出现错误时才能快速定位是规则、运行权限、外部工具还是调度问题。

## 哪些配置会跨入口共享

官方说明中，**Codex CLI、IDE 扩展和 ChatGPT 桌面端中的 Codex共享同一套本地配置层**，包括用户 `~/.codex/config.toml` 与受信任项目的 `.codex/config.toml`。CLI 与 IDE 扩展也共享缓存的本地登录；从其中一处登出后，下一次使用另一处仍需重新登录。

但“共享配置层”不代表每项 UI 功能到处都有：

- profile 通过 CLI 的 `--profile` 显式选择；
- plugins、automations、worktrees 等入口具有表面差异；
- Codex Cloud 在隔离环境运行，不会自动拥有本机文件、工具和凭据；
- Windows 原生与 WSL 的 `CODEX_HOME` 默认不同，因此配置和认证不会自然共享。

迁移或排错时先确认实际 `CODEX_HOME`、当前工作目录、项目是否受信任和使用的是哪个表面。

## 官方资料与声明

直接相关官方资料：

- [Customization 概念](https://developers.openai.com/codex/concepts/customization)
- [AGENTS.md 发现与层级](https://developers.openai.com/codex/guides/agents-md)
- [配置基础](https://developers.openai.com/codex/config-basic)
- [配置参考](https://developers.openai.com/codex/config-reference)
- [Skills](https://developers.openai.com/codex/skills)
- [MCP](https://developers.openai.com/codex/mcp)
- [Plugins](https://developers.openai.com/codex/plugins)
- [Subagents](https://developers.openai.com/codex/agent-configuration/subagents)
- [Scheduled tasks](https://developers.openai.com/codex/app/automations)

本文为非官方中文教程，不代表 OpenAI，也未使用 OpenAI logo 或官方截图。内容由 AI 辅助起草；发布前应由维护者依据官方资料完成人工复核。配置 schema、实验功能与各表面能力更新较快，应用前请以当前官方文档和本机 `codex --help` 为准。

**最后核验：2026-09-03。**
