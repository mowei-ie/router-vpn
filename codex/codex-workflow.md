---
title: "从任务到 Git 交付：一套可审阅的 Codex 工作流"
description: "以「新增故障排查文档」为贯穿案例，讲解一套可审阅的 Codex 工程交付流程：先划定 sandbox 与 approval policy 安全边界，再依次建立上下文、制定计划、局部编辑、分层验证、审阅 diff，最后由人工完成 Git 提交与推送，并说明本地、Cloud 与 GitHub、Slack 集成如何分工协作。"
pubDate: "2026-09-03T15:42:03+08:00"
updatedDate: "2026-09-03T15:42:03+08:00"
category: "codex"
tags: ["OpenAI Codex", "工程工作流", "Git", "代码审阅"]
draft: false
order: 3
---

# 从任务到 Git 交付：一套可审阅的 Codex 工作流

“让 Agent 把文档更新一下”缺少范围、事实来源和完成标准。可靠工作流应把任务拆成能检查的状态变化：建立上下文、形成计划、局部编辑、运行验证、审阅 diff，最后由人完成 Git 交付。

本篇以一个原创贯穿案例说明：

> 为文档仓库增加一篇“路由器 VPN 故障排查”短文；只能修改 `docs/vpn-troubleshooting.md`，沿用仓库风格，检查相对链接，不修改网络配置，不提交或推送。

你可以把同一结构换成修复小型应用的一个 bug。

## 先划安全边界

在写提示词前，先决定执行环境和权限。

### Sandbox 与 approval policy 不是一回事

- **sandbox mode** 是技术边界：Agent 能读写哪些目录、命令能否访问网络。
- **approval policy** 是交互边界：什么动作需要暂停并请求确认。

本地 CLI/IDE/桌面端默认应把写入限制在活动工作区，并保持命令网络访问关闭。常规任务可采用 `workspace-write` 加 `on-request`；只调查时用 `read-only`。`danger-full-access` 会移除关键隔离，只应在外部环境本身已可靠隔离时使用。

网络访问不是“搜索资料”这一句的同义词。构建脚本、包管理器和子进程也会继承允许的网络能力。只在任务确实需要时开启，并核对访问目标。

### 密钥与敏感信息

- 不把 API key、cookie、SSH 私钥、生产连接串写入提示或仓库。
- 把 `~/.codex/auth.json` 当作密码文件，不提交、不粘贴到工单。
- Cloud 环境 secret 只用于 setup，Agent 阶段会移除；仍应按最小权限配置。
- 使用 worktree 时，忽略文件默认不会全部复制。`.worktreeinclude` 可以选择性复制必要的忽略文件，但把 `.env` 纳入其中会扩大暴露面，应优先提供无密钥的开发配置。

### 分支与 worktree

当前工作区有未完成改动时，不要让另一个长任务修改同一批文件。可选做法：

- 新建任务分支后在当前 checkout 工作；
- 在 ChatGPT 桌面端为独立会话创建 Git worktree；
- 使用 Cloud 的隔离环境处理已经推送并可独立验证的任务。

worktree 共享 Git 元数据，但每个 checkout 有独立文件视图。它减少并发冲突，不会自动保证改动正确，也不代表 Agent 应自动提交。

## 第一步：建立可用上下文

先让 Codex调查，不立即编辑。CLI 中应明确路径；IDE 扩展虽会附带打开文件与选区，也不要依赖它猜测范围。

```text
目标：新增 docs/vpn-troubleshooting.md。
先只读调查，不编辑。

请读取：
- 仓库根目录 AGENTS.md（若存在）
- docs/ 下两篇最接近的教程
- 仓库的 Markdown 检查脚本或 CI 配置

输出：
1. 应沿用的标题、提示块和链接风格；
2. 可执行的本地验证命令；
3. 缺少但会影响写作的事实。

限制：不要读取或展示任何 .env、凭据文件和用户目录内容。
```

好的调查结果应该引用实际文件和命令，而不是泛泛描述“遵循现有风格”。如果仓库没有 `docs/` 或找不到验证脚本，Codex 应明确报告，不应虚构。

## 第二步：先计划，再决定是否编辑

对于多步骤任务，要求计划包含文件、动作、验证和停止条件：

```text
基于刚才调查，为这项任务拟一个最多 5 步的计划。
每一步写清：
- 读取或修改的文件；
- 预期产物；
- 验证方式；
- 需要我确认的假设。

只允许修改 docs/vpn-troubleshooting.md。
若必须改其他文件，停止并说明原因，不要自行扩大范围。
```

计划不是形式。此时应人工检查：

- 是否引用了真实的官方事实来源；
- 是否把“新建目标文件”偷换成“顺便重构目录”；
- 验证命令是否存在且与 Markdown 相关；
- 是否会访问网络、安装依赖或执行项目脚本。

事实仍不完整时，先补上下文或缩小表述，再批准编辑。

## 第三步：局部编辑并保留可追踪性

批准后给出具体内容边界：

```text
按已确认计划创建 docs/vpn-troubleshooting.md。

必须包含：
- 开始前的备份与授权确认；
- “现象 → 只读诊断 → 恢复动作”的顺序；
- Windows、macOS、Linux 均可理解的说明；
- 指向现有安装指南的相对链接。

禁止：
- 编造路由器菜单路径；
- 写入真实 IP、账号或密钥；
- 修改其他文件；
- git add、commit、push。

编辑完成后先停下，列出改动摘要和仍需人工核验的设备差异。
```

范围限制应同时出现在持久指令（若适用）和本次提示中。持久指令说明团队常规，本次提示说明本次授权，两者不能互相替代。

## 第四步：分层验证

验证从便宜、局部的检查开始，再扩大范围：

1. **结构检查**：文件存在、标题层级合理、无空链接。
2. **范围检查**：`git status --short` 只出现授权文件。
3. **链接检查**：所有相对链接目标存在，锚点可解析。
4. **仓库检查**：运行项目已有的 Markdown lint 或文档构建。
5. **内容检查**：人工核对设备相关说法、危险命令和回滚说明。

可给 Codex：

```text
现在只做验证，不再编辑。
先运行仓库已有的 Markdown 检查；不要安装新依赖。
再确认本文相对链接目标存在，并用 git status 核对修改范围。
逐条报告命令、退出码和失败原因，不要用“检查通过”替代证据。
```

某项检查因缺依赖无法运行时，结果应标为“未执行”，而不是“通过”。安装依赖会改变环境并可能访问网络，需单独批准。

## 第五步：审阅 diff，而不是审阅总结

在 CLI 中可用 `/review` 发起工作树审阅；也应自己查看：

```powershell
git status --short
git diff --check
git diff -- docs/vpn-troubleshooting.md
```

macOS/Linux 使用相同 Git 命令。审阅至少回答：

- 是否只改了授权文件？
- 新增内容是否能从来源或仓库事实得到支持？
- 链接、命令和路径是否真实？
- 是否有“删除安全提醒、扩大权限、联网下载”这类隐蔽副作用？
- 自动检查没覆盖什么？

发现问题时，用小步修正提示：

```text
只修正 diff 中“恢复动作缺少回滚条件”这一项。
不要改标题结构和其他段落。修改后重跑同一组验证并展示新 diff。
```

这比“把所有问题都优化一下”更容易审阅。

## 第六步：由人控制 Git 交付

验证和审阅完成后，再决定是否提交：

```powershell
git add -- docs/vpn-troubleshooting.md
git diff --cached
git commit -m "docs: add VPN troubleshooting guide"
```

推送和创建 PR 是后续外部动作，应再次确认分支、远端和组织流程。Codex 可能在获得明确指令与权限后帮助执行 Git 操作，但不会、也不应被描述为“永远自动提交或推送”。

建议在 PR 中记录：

- 任务目标与范围；
- 实际运行的验证；
- 未覆盖的设备/平台差异；
- AI 参与情况和人工审阅人。

## 本地、Cloud 与集成怎样分工

### 本地 CLI、IDE 和桌面端

适合含未提交改动、依赖本机工具或需要快速人机迭代的任务。IDE 自动附带打开文件上下文；CLI 更适合明确路径和命令；桌面端适合多会话、worktree 与 automations。三者的本地执行都要尊重 sandbox 与审批。

### Codex Cloud

适合可在 GitHub 仓库和可复现环境中独立运行的长任务。Cloud 线程在隔离环境中克隆仓库和检出分支，可以返回 diff 或创建 PR。Agent 阶段默认无网络，环境设置决定 setup、依赖与网络。

不要把“在云端隔离”理解为“不必审阅”。Cloud 可能缺少本机未推送状态、私有服务或真实设备，仍需回到本地/CI 验证。

### GitHub code review

连接并启用 Codex code review 后，可配置自动审阅，或在 PR 评论中用 `@codex review` 请求审阅。它审的是 GitHub 上的 PR 上下文，不等同于本地 `/review`，也不会替代测试、维护者审批或安全审计。

### Slack

安装并连接 Slack 集成后，可在频道或线程中提及 `@Codex` 启动 Cloud 任务。它依赖 ChatGPT 方案、GitHub 连接、Cloud 环境及工作区管理员策略。Slack 消息可能含不完整或不可信上下文，提示中应明确仓库、环境和验收条件，并回到 Cloud 线程/PR 审阅结果。

API key 登录不提供 GitHub code review、Slack 这类云端集成功能。

## 把流程固化，但不要过早自动化

当团队多次成功执行同一流程后，可以：

- 把稳定约束写进 `AGENTS.md`；
- 把检查步骤做成 Skill；
- 用 MCP 连接受控的文档或工单工具；
- 用 subagents 并行做互不写同一文件的调查；
- 在 ChatGPT 桌面端建立 automation。

自动化应在手动流程已稳定后启用。后台任务可能无人盯守；优先在独立 worktree、只读或最小写权限下运行，并定期清理、审阅运行结果。实现方式见[Codex 定制指南](codex-customization.md)。

## 交付前检查单

- [ ] 提示明确了目标、允许路径、禁止动作与验收命令。
- [ ] 计划经人工确认，未擅自扩大范围。
- [ ] sandbox、审批和网络权限与风险匹配。
- [ ] 未向 Agent 暴露密钥或无关敏感文件。
- [ ] 验证结果包含实际命令和失败项。
- [ ] 人工查看了 `git status`、实际 diff 和暂存 diff。
- [ ] 分支/worktree 与目标远端正确。
- [ ] 提交、推送、PR 均经过独立确认。

## 官方资料与声明

直接相关官方资料：

- [Codex 最佳实践](https://developers.openai.com/codex/learn/best-practices)
- [Codex workflows](https://developers.openai.com/codex/workflows)
- [Sandbox 与审批](https://developers.openai.com/codex/sandboxing)
- [安全说明](https://developers.openai.com/codex/security)
- [Cloud 环境](https://developers.openai.com/codex/cloud)
- [Git worktrees](https://developers.openai.com/codex/app/worktrees)
- [Codex 汇总手册：GitHub code review](https://developers.openai.com/codex/codex-manual.md)
- [Slack 集成](https://developers.openai.com/codex/integrations/slack)

本文为非官方中文教程，不代表 OpenAI，也未使用 OpenAI logo 或官方截图。内容由 AI 辅助起草；发布前应由维护者依据官方资料完成人工复核。权限默认值、Cloud 行为和集成功能可能随版本或工作区策略变化，执行前请核对当前官方说明。

**最后核验：2026-09-03。**
