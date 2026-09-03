# OpenAI Codex 中文教程

本专题面向希望把 Codex 用进真实软件工程流程的中文读者。内容从“它是什么”开始，逐步进入命令行、交付流程和可复用配置；示例围绕文档维护与小型项目设计，不依赖特定框架。

> Codex 是 OpenAI 的软件工程 Agent。它能在授权边界内读取仓库、修改文件、运行命令并解释结果，但输出仍需由人审阅和负责。

## 专题地图

- [认识 Codex：产品形态、登录与边界](codex-guide.md)
  先辨清 ChatGPT 桌面端中的 Codex、Web/Cloud、CLI、IDE 扩展和移动端入口，以及订阅登录与 API key 登录的差别。
- [Codex CLI 快速上手](codex-cli-quickstart.md)
  以 Windows 10/11 和 PowerShell 为主线完成安装、登录与第一个“审阅并修正文档链接”任务，同时给出 macOS/Linux 差异。
- [从任务到 Git 交付的 Codex 工作流](codex-workflow.md)
  用一个贯穿案例练习建立上下文、先计划、局部编辑、验证、审阅 diff 和人工完成 Git 交付。
- [Codex 定制：从指令到自动化](codex-customization.md)
  说明 `AGENTS.md`、`config.toml`、profiles、Skills、MCP、plugins、subagents
  与 automations 如何分工和组合。
- [在 OpenAI Codex 中使用 DeepSeek：安全配置、验证与回滚](codex-deepseek-guide.md)
  第三方模型集成进阶篇：用隔离 profile、安全凭据、分层验证和可撤销回滚接入
  DeepSeek。

## 建议阅读路径

**第一次接触：**

1. 读[认识 Codex](codex-guide.md)，选择适合自己的入口和登录方式。
2. 按[CLI 快速上手](codex-cli-quickstart.md)完成一次低风险任务。
3. 用[工作流](codex-workflow.md)把“能运行”升级为“可审阅、可验证、可交付”。
4. 遇到重复规则或固定流程时，再读[定制指南](codex-customization.md)。
5. 需要接入第三方模型时，读 [DeepSeek 集成进阶篇](codex-deepseek-guide.md)，
   先理解数据、计费与云能力边界。

**已有 Agent 使用经验：**

- 想迁移团队规范：直接看[定制指南的 AGENTS.md](codex-customization.md#用-agentsmd-写持久指令)。
- 想降低误改与越权风险：看[工作流的安全边界](codex-workflow.md#先划安全边界)。
- 只想本地试用：看[CLI 安装与登录](codex-cli-quickstart.md#安装与升级)。
- 想隔离配置第三方模型：看 [DeepSeek 集成进阶篇](codex-deepseek-guide.md#二先备份再用-profile-隔离)。
- 想比较其他工具：参阅 [ChatGPT Plus 指南](../chatgpt/chatgpt-plus-guide.md)、
  [OpenAI API 指南](../chatgpt/openai-api-guide.md)与
  [Cursor 指南](../cursor/cursor-guide.md)。

## 版本更新策略

Codex 更新较快，本专题采用以下维护规则：

1. 产品能力、支持平台、命令和配置键只以 OpenAI 官方 Codex 文档为准。
2. 每篇文末标注“最后核验”日期；命令执行前仍应查看官方变更日志和内置帮助。
3. 不固定写入动态模型名、套餐价格或用量额度。必须提及时，注明核验日期并提醒可能变化。
4. 对标为 beta、experimental 或分批推出的功能，不将其描述为对所有用户稳定可用。
5. 更新时优先核验安装、认证、安全、配置参考与 changelog，再检查本文内链和示例。

## 官方来源入口

- [Codex 汇总手册](https://developers.openai.com/codex/codex-manual.md)
- [Codex CLI](https://developers.openai.com/codex/cli)
- [CLI 命令参考](https://developers.openai.com/codex/cli/reference)
- [最佳实践](https://developers.openai.com/codex/learn/best-practices)
- [安全说明](https://developers.openai.com/codex/security)
- [配置参考](https://developers.openai.com/codex/config-reference)
- [更新日志](https://developers.openai.com/codex/changelog)

## 使用与版权说明

本专题为非官方中文教程，不代表 OpenAI，也未使用 OpenAI logo 或官方截图。文中信息
基于直接相关的 OpenAI 官方资料重新组织并原创撰写；示例、信息架构和风险提示均为
本专题自行设计。OpenAI、ChatGPT、Codex 等名称及商标归其权利人所有。

内容由 AI 辅助起草；发布前应由维护者依据官方资料完成人工复核。执行任何命令、授权仓库或提交代码前，请结合当前官方文档、组织政策与实际 diff 独立判断。

**最后核验：2026-09-03。**
