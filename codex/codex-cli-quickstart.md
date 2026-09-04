---
title: "Codex CLI 快速上手：Windows 与 PowerShell 主线"
description: "以 Windows 10/11 与 PowerShell 为主线的 Codex CLI 上手教程：完成 npm 安装与升级、ChatGPT 与 API key 两种登录方式，动手练习一个「审阅并修正文档链接」的低风险任务，介绍 /init、/review、/mcp 等常用斜杠命令，并列出常见报错的排查方法。"
pubDate: "2026-09-03T15:42:03+08:00"
updatedDate: "2026-09-03T15:42:03+08:00"
category: "codex"
tags: ["OpenAI Codex", "Codex CLI", "Windows", "PowerShell"]
draft: false
order: 2
---

# Codex CLI 快速上手：Windows 与 PowerShell 主线

本篇从一个全新终端开始，让 Codex 在明确限制下检查并修正文档链接。主线适用于 Windows 10/11 与 PowerShell；macOS/Linux 的差异集中说明。

## 开始前准备

你需要：

- 一个 ChatGPT 账户，或一个已启用计费和模型权限的 OpenAI Platform API key；
- Git（建议）；
- 使用 npm 安装时所需的 Node.js 与 npm；
- 一个可安全试验的本地目录，最好已经纳入 Git。

从 Node.js 官方渠道安装当前受支持的 LTS 版本，不在本文固定版本号。重开 PowerShell 后检查：

```powershell
node --version
npm --version
git --version
```

macOS/Linux 在终端执行相同的版本检查即可。若公司设备限制全局 npm 安装，请先按组织的软件管理政策处理，不要盲目使用管理员权限或 `sudo`。

## 安装与升级

### 使用 npm 安装

Windows PowerShell、macOS 和 Linux 均可使用：

```powershell
npm install -g @openai/codex@latest
codex --version
```

`@latest` 会获取 npm 当前标记的最新稳定包，因此实际版本会随时间变化。若 `codex` 未被识别，重开终端并确认 npm 全局可执行目录已加入 `PATH`。

升级可重复执行同一安装命令：

```powershell
npm install -g @openai/codex@latest
codex --version
```

当前 CLI 还提供：

```powershell
codex update
```

它只在当前安装的发行版支持自更新时应用更新。使用 npm 管理安装时，重复运行 npm 安装命令更容易保持来源一致。更新后同时查看[官方 changelog](https://developers.openai.com/codex/changelog)，不要仅凭版本号猜测命令行为。

### Windows 原生与 WSL2

截至 2026-09-03，Codex CLI 官方支持在 Windows 上原生运行，并使用原生 Windows sandbox；不再是“只能通过 WSL”的状态。官方建议默认使用原生 Windows sandbox，以获得更直接的 Windows 工作流。

以下情况适合 WSL2：

- 项目和依赖本来就在 Linux 文件系统；
- 构建链依赖 Linux 工具或 shell 行为；
- 原生 Windows sandbox 无法满足现有环境。

WSL1 已不受当前版本支持。使用 WSL2 时，尽量把 Linux 项目放在 `~/code/...`，避免长期把高 I/O 工作放在 `/mnt/c/...`。WSL 中的 `~/.codex` 与 Windows 的 `%USERPROFILE%\.codex` 默认不是同一个目录，认证与配置不会自动共享。

## 登录：只使用官方流程

### ChatGPT 登录

在 PowerShell 中运行：

```powershell
codex login
```

不带参数时，CLI 默认启动 ChatGPT 浏览器 OAuth 流程。浏览器完成登录后，凭据返回 CLI。若你在无图形界面或 localhost 回调受限的环境，可在交互界面选择 Device Code，或使用官方当前提供的 beta 命令：

```powershell
codex login --device-auth
```

检查是否已有凭据：

```powershell
codex login status
```

### API key 登录

仍然运行：

```powershell
codex login
```

然后在 CLI 的交互登录界面选择 **API key**，按提示输入从 OpenAI Platform 获取的 key。官方参考将 API key 登录列为 `codex login` 支持的认证方式，但没有要求用户猜测一个未记录的 `--api-key` 参数，因此本文不提供这类命令。

API key 使用按 API 用量计费，且不能使用 Codex Cloud、GitHub code review、Slack 等云端功能。不要把 key：

- 写进 PowerShell 历史或脚本；
- 放入仓库中的 `.env`、Markdown 或配置示例；
- 作为任务提示发送给 Agent；
- 提交到 Git。

自动化场景另有仅供 `codex exec` 单次运行使用的 `CODEX_API_KEY`。它不应设置成会运行仓库代码的整个 CI job 的环境变量；首次交互体验不需要它。

退出登录会删除本地保存的 ChatGPT/API key 凭据：

```powershell
codex logout
```

## 第一个任务：审阅并修正文档链接

### 1. 建立一个可恢复的练习目录

```powershell
New-Item -ItemType Directory -Force codex-link-lab | Out-Null
Set-Location codex-link-lab
git init
@'
# 示例文档

- [项目主页](https://example.com)
- [安装说明](docs/install.md)
- [贡献指南](CONTRIBUTING.md)
'@ | Set-Content -Encoding utf8 README.md
New-Item -ItemType Directory -Force docs | Out-Null
'# 安装说明' | Set-Content -Encoding utf8 docs/install.md
git add README.md docs/install.md
git commit -m "创建链接检查练习"
```

若 Git 尚未配置身份，最后一条提交命令可能失败；这不影响练习，但开始前应确认 `git status`，避免与其他未提交工作混在一起。

### 2. 启动 Codex

```powershell
codex
```

首次进入仓库时，Codex 可能要求确认是否信任项目。只有在你了解目录内容时才信任；项目级 `.codex/` 配置、hooks 和 rules 仅在受信任项目中加载。

### 3. 先建立项目指令

在 Codex 交互界面输入：

```text
/init
```

`/init` 会在当前目录生成 `AGENTS.md` 初稿。打开它并把内容收敛为适合练习的规则，例如：

```md
# 项目规则

- 只修改 Markdown 文件。
- 相对链接必须指向仓库内已存在的文件。
- 不执行提交、推送或删除操作。
- 完成后运行本地链接检查并展示 git diff。
```

生成结果只是脚手架，不应未经审阅直接当作团队规范。

### 4. 发出范围明确的原创任务

在交互界面输入：

```text
检查 README.md 中的链接。只修复能从仓库内容确定为错误的相对链接；
不要替换有效的外部链接，不要创建缺失页面，也不要提交。
先说明检查方法，再编辑；完成后列出每处修改和仍无法确认的链接。
```

在这个练习中，`CONTRIBUTING.md` 不存在。理想结果不是编造文件，而是把它列为无法在本地确认的问题；若 Agent 建议删除或改写，应先询问依据。

### 5. 审阅工作区

输入：

```text
/review
```

`/review` 可审阅未提交改动，也支持按基准分支、提交或自定义要求进行审阅。随后退出或另开 PowerShell，自己核对：

```powershell
git status --short
git diff -- README.md AGENTS.md
```

不要只接受“已完成”的文字总结。确认修改范围、链接目标和编码均正确后，才由你决定是否提交。

## 三个实用斜杠命令

斜杠命令应在 Codex 的交互界面中输入，不是在 PowerShell 提示符下执行。

- `/init`：在当前目录生成 `AGENTS.md` 脚手架。
- `/review`：让独立审阅流程检查工作树、提交或相对基准分支的变化。
- `/mcp`：列出当前配置的 MCP 工具；加 `verbose` 可查看服务器细节。

MCP 的增删和 OAuth 管理使用 CLI 子命令 `codex mcp ...`，其成熟度在当前命令参考中仍标为 experimental。先查看实时帮助再操作：

```powershell
codex mcp --help
codex mcp list
```

不要把未知 MCP server 当作普通 npm 包随意接入；它可能获得外部系统数据和操作权限。更完整的职责边界见[定制指南](codex-customization.md#用-mcp-连接外部工具)。

## 常见问题

### PowerShell 找不到 codex

先重开终端，再检查：

```powershell
npm prefix -g
npm list -g @openai/codex --depth=0
```

确认 npm 全局可执行目录在当前用户 `PATH`。不要为了绕过 PATH 问题反复以管理员身份安装。

### 浏览器登录没有返回 CLI

重新运行 `codex login`；远程或回调受限环境使用交互式 Device Code，或 `codex login --device-auth`。公司 TLS 代理问题应按组织证书策略处理，不要关闭证书校验。

### 权限提示太多或太少

sandbox 决定命令技术上能访问什么，approval policy 决定何时暂停询问。初学者应保持工作区写入和按需审批，不要为了省一次确认切换到完全访问。详见[工作流的安全边界](codex-workflow.md#先划安全边界)。

## 官方资料与声明

直接相关官方资料：

- [Codex CLI](https://developers.openai.com/codex/cli)
- [CLI 命令参考](https://developers.openai.com/codex/cli/reference)
- [CLI 斜杠命令](https://developers.openai.com/codex/cli/slash-commands)
- [认证方式](https://developers.openai.com/codex/auth)
- [Windows 原生 sandbox](https://developers.openai.com/codex/windows/windows-sandbox)
- [WSL2 设置](https://developers.openai.com/codex/windows/wsl)
- [Codex 更新日志](https://developers.openai.com/codex/changelog)

本文为非官方中文教程，不代表 OpenAI，也未使用 OpenAI logo 或官方截图。内容由 AI 辅助起草；发布前应由维护者依据官方资料完成人工复核。CLI 命令、平台支持与功能成熟度会更新，执行前请用 `codex --help`、子命令 `--help` 和官方文档再次确认。

**最后核验：2026-09-03。**
