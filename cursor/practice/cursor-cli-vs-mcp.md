---
title: "MCP 没死：Cursor Agent 中 CLI、MCP、Rules 与 Skills 的取舍"
description: "深入辨析 Cursor Agent 中 Rules、AGENTS.md、Skills、CLI 与 MCP 五个概念的边界与协作关系，结合作者经验说明为何日常任务里坚持 CLI 优先、MCP 补位，并从上下文成本、可复现性、信任边界、执行安全等多个维度给出工具选型的实际判断标准，帮助读者理性取舍不盲从结论。"
pubDate: "2026-07-23T11:58:47+08:00"
updatedDate: "2026-09-03T15:42:03+08:00"
category: "cursor"
tags: ["Cursor", "MCP", "CLI", "Rules", "Agent Skills"]
draft: false
order: 6
---

# MCP 没死：Cursor Agent 中 CLI、MCP、Rules 与 Skills 的取舍

> [Cursor 推广链接](https://cursor.com/referral?code=Y3RXKKUGMJ2G)：优惠与适用条件以结账页实际显示为准。

**摘要**：CLI 与 MCP 都是 Agent 获取能力的方式，但适用边界不同。本文把 Rules、`AGENTS.md`、Skills、CLI、MCP 分开说明，并保留作者在日常任务中“CLI 优先、MCP 补位”的经验判断。

---

## 1. 先分清五个概念

- **Rules**：给 Agent 持续提供系统级项目指令。Project Rules 位于 `.cursor/rules/*.mdc`，可以按相关性、文件路径或始终应用。
- **`AGENTS.md`**：纯 Markdown 项目指令，是 Project Rules 的简洁替代；支持根目录和子目录。
- **Skills**：以 `SKILL.md` 为入口的可移植任务包，可带脚本、模板、参考资料和资源，按需发现或通过 `/技能名` 调用。
- **CLI**：Agent 通过终端调用 `git`、`gh`、`docker`、`curl` 等命令行程序。
- **MCP**：Cursor 通过标准协议连接外部工具与数据源，可暴露 tools、prompts、resources 等能力。

Skills 不等于 Rules，也不等于 `AGENTS.md`。前三者主要影响“知道什么、遵守什么、如何完成一类任务”，CLI 与 MCP 则更接近实际执行和外部能力接入。

---

## 2. MCP 的上下文成本：需要按现代 Cursor 重新理解

MCP 服务器会向客户端暴露工具目录和参数结构，这会产生一定上下文与选择成本。但不能笼统断言“所有 MCP 工具定义在每一轮都全量常驻”。

现代 Cursor 支持工具搜索和动态发现，实际注入量会受客户端版本、服务器能力、启用状态和当前任务影响。官方的上下文用量视图也会分别展示 Tools、Skills、Rules、MCP 等类别。判断某个 MCP 是否“太重”，应查看当前会话的上下文分解和实际调用表现，而不是沿用旧版本机制推断。

仍然值得注意的成本：

1. **工具目录与说明**：服务器越多、工具越相似，模型选择工具时越可能受干扰。
2. **运行与认证**：本地进程、OAuth、令牌、版本和网络都可能成为故障点。
3. **信任边界**：MCP 服务器可能读取数据、调用外部 API 或执行代码，安装前要核验来源和权限。

以上是机制与风险判断；“接三四个服务器一定明显降低准确率”没有统一官方结论。

---

## 3. 为什么 CLI 经常好用

以下是作者的**经验判断**，不是 Cursor 的产品保证。

### 按需查看帮助

Agent 可以从 `gh --help`、`gh pr --help` 逐层找到命令，不必预先加载整套命令文档。成熟 CLI 还常提供 `--json`、明确退出码和可复现错误输出。

### 容易复现与组合

同一条命令可以由人直接在终端复跑，配合 PowerShell 管道、`jq` 或工具自带过滤参数处理输出。例如：

```bash
gh pr list --state open --json number,title,author
```

在 Windows PowerShell 中不要照搬 Bash 语法；尤其 `sc` 可能解析为 `Set-Content`，调用 Windows 服务控制程序应写 `sc.exe`。

### 适合的任务

- Git、GitHub、测试、构建与容器操作
- 文件与日志批处理
- 已有成熟 CLI 且输出可机器解析的服务
- 需要把一次性步骤固化为仓库脚本的工作流

CLI 的不足也很明确：命令可能拥有广泛系统权限，文本输出可能不稳定，认证可能需要人工交互，写入操作也可能不可逆。

---

## 4. MCP 值得保留的场景

1. **没有合适 CLI 的外部系统**：例如只通过 API/MCP 暴露的内部平台。
2. **标准化跨客户端接入**：团队希望在多个 MCP 客户端复用同一受控接口。
3. **结构化能力与界面**：工具、资源、提示模板，以及支持时的 MCP Apps。
4. **集中封装业务流程**：把审批、参数校验、审计日志做在服务端实现中。
5. **浏览器或 SaaS 集成**：当对应官方插件或可信 MCP 比自行拼装脚本更合适时。

“MCP 返回一定比 CLI 更结构化”也不是绝对事实：现代 CLI 可以输出 JSON，MCP 工具实现同样可能返回自由文本。应比较具体工具。

---

## 5. 安全性：MCP 不天然比 shell 更安全

安全性取决于：

- Agent 和操作系统授予的权限
- CLI 进程或 MCP 服务器实际能访问的文件、网络与凭据
- MCP 服务器实现是否安全、是否可信
- API Key / OAuth scope 是否最小化
- Cursor 当前 Run Mode、allowlist、沙箱和实际审批
- 服务端是否有参数校验、审计和二次授权

把危险操作封装成范围狭窄、服务端校验完善的 MCP 工具，可能比开放通用 shell 更易控制；但一个高权限、实现不透明的 MCP 也可能比受限 shell 更危险。两者都不能替代最小权限和人工复核。

本地 Agent 的 Run Modes：

- **Auto-review**：allowlist 直接运行，其余调用尽量在沙箱中运行或由分类器审查。
- **Allowlist**：只有 allowlist 中的动作自动运行，可结合沙箱。
- **Run Everything**：所有工具调用自动运行，不使用沙箱和分类器，风险最高。

`permissions.json` 只用于引导 Auto-review 的放行/拦截倾向，不是安全边界。不要把“只读自动、写入必问”写成固定保证，实际以用户配置、团队策略、保护机制和审批界面为准。

---

## 6. 在 Cursor 里落地

### 安装并登录 GitHub CLI

```powershell
winget install --id GitHub.cli
gh auth login
gh auth status
```

认证流程通常需要浏览器或终端人工确认。令牌不要写进仓库。

### 选择持久指令形式

简单、可读的仓库约定可以放在根目录 `AGENTS.md`；需要路径匹配和触发方式时使用 `.cursor/rules/*.mdc`；需要脚本、模板和参考资料组成的可复用工作流时建立 `.cursor/skills/<name>/SKILL.md`。不要把三者混写成同一机制。

示例 `AGENTS.md`：

```markdown
# Agent 操作约定

- 当前环境是 Windows + PowerShell；不要假设 Bash 命令可直接运行。
- 陌生命令先查看官方帮助。
- 优先使用能输出 JSON 的 CLI。
- 执行部署、删除、推送、合并或系统修改前，说明影响并遵循当前审批设置。
- 不执行 `git push --force`、`git reset --hard` 等破坏性操作，除非用户明确要求。
```

### 只启用当前任务需要的 MCP

从 Customize 管理 MCP 或在 `mcp.json` 配置。禁用无关服务器可以减少工具干扰和攻击面。对每个服务器：

1. 核验发布者和源代码。
2. 使用最小权限令牌，优先环境变量。
3. 检查传输方式、网络范围和可用工具。
4. 首次调用时审阅参数与响应。

### 固化高频脚本

把验证过的命令放到 `scripts/`，补上参数校验、错误处理和 dry-run。脚本本身应接受代码审查，不要因为由 Agent 生成就直接信任。

---

## 7. 结论

我的经验分工是：

- **Rules / `AGENTS.md`**：持续约束项目行为。
- **Skills**：封装一类可复用工作流，并按需加载材料。
- **CLI**：成熟、透明、易复现的本地和开发工具。
- **MCP**：标准化外部能力、团队服务和没有合适 CLI 的集成。

选择工具时比较实际权限边界、可审计性、上下文成本、可靠性与维护成本，不必把 MCP 与 CLI 变成非此即彼的竞赛。

## 相关教程

- [Cursor 2026 使用指南](../cursor-guide.md)
- [Cursor SSH 远程开发](./cursor-ssh-linux.md)
- [阿里云 ECS 部署 Node.js 应用](./cursor-aliyun-deploy.md)

## 官方来源与声明

最后核验：**2026-09-03**

- [Cursor MCP 文档](https://cursor.com/docs/context/mcp)
- [Cursor CLI](https://cursor.com/docs/cli/using)
- [Rules](https://cursor.com/docs/context/rules)
- [Agent Skills](https://cursor.com/docs/skills)
- [Run Modes](https://cursor.com/docs/agent/security/run-modes)

本文为原创经验总结，非 Cursor 官方文档；经验判断已明确标注。内容曾由 AI 辅助校对；发布前应由维护者依据官方资料完成人工复核。
