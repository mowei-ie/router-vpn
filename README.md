# AI 编程实战教程 2026 — Cursor / ChatGPT / OpenAI API / OpenAI Codex

[![在线阅读](https://img.shields.io/badge/在线阅读-www.aixiaobai168.com-0ea5e9?style=for-the-badge)](https://www.aixiaobai168.com)
[![GitHub stars](https://img.shields.io/github/stars/wybzsngw/ai-tools-guide?style=for-the-badge&label=stars&color=orange)](https://github.com/wybzsngw/ai-tools-guide/stargazers)
[![Code License](https://img.shields.io/badge/代码-Apache_2.0-10b981?style=for-the-badge)](LICENSE)
[![Docs License](https://img.shields.io/badge/教程-CC_BY_4.0-0ea5e9?style=for-the-badge)](LICENSE-docs.md)
![Last Updated](https://img.shields.io/badge/最近更新-2026.09-7c4dff?style=for-the-badge)

本仓库提供 Cursor、ChatGPT、OpenAI API 与 OpenAI Codex 的中文实战教程，重点关注可执行步骤、工程流程、风险边界和版本核验。正式排版版本发布在 [aixiaobai168.com](https://www.aixiaobai168.com)（由本仓库 Markdown 构建生成），GitHub 仓库是内容源码与协作入口。

## 教程入口

| 专题 | 入口 | 主要内容 |
| --- | --- | --- |
| Cursor | [Cursor 专题](cursor/README.md) | 完整指南、建站、全栈开发、SSH、部署与系统运维 |
| ChatGPT | [ChatGPT Plus / Go 指南](chatgpt/chatgpt-plus-guide.md) | 订阅、支付、账号安全与常见问题 |
| OpenAI API | [OpenAI API 指南](chatgpt/openai-api-guide.md) | 申请、密钥安全、计费与开发接入 |
| OpenAI Codex | [Codex 专题](codex/README.md) | 产品入口、CLI、工程工作流与定制 |

Gemini CLI 尚未建档，因此不列入教程主表。本仓库目前也没有 Claude Code 或 Windsurf 专题，请勿将待规划方向视为已有内容。

### Codex 核心文章

- [认识 OpenAI Codex：入口、登录与工具边界](codex/codex-guide.md)
- [Codex CLI 快速上手：Windows 与 PowerShell 主线](codex/codex-cli-quickstart.md)
- [从任务到 Git 交付：一套可审阅的 Codex 工作流](codex/codex-workflow.md)
- [Codex 定制指南：指令、配置、技能与自动化](codex/codex-customization.md)
- [在 OpenAI Codex 中使用 DeepSeek：安全配置、验证与回滚](codex/codex-deepseek-guide.md)

### Cursor 实战连载

- [用 Cursor 搭建静态网站](cursor/practice/cursor-build-static-site.md)
- [Cursor + SSH 远程开发 Linux](cursor/practice/cursor-ssh-linux.md)
- [Cursor 部署到阿里云](cursor/practice/cursor-aliyun-deploy.md)
- [用 Cursor 做全栈 App](cursor/practice/cursor-fullstack-app.md)
- [Cursor CLI vs MCP](cursor/practice/cursor-cli-vs-mcp.md)
- [用 Cursor 修 Windows 系统问题](cursor/system-ops/cursor-fix-windows-system.md)

## 仓库结构

```text
├── cursor/          Cursor 指南与实战连载
├── chatgpt/         ChatGPT 与 OpenAI API 教程
├── codex/           OpenAI Codex 专题与核心教程
├── extras/          Tailscale、部署指南等扩展内容
├── src/             Astro 站点源码（页面、布局、内容 schema）
├── public/          站点静态资源（robots.txt、_redirects、验证文件等）
├── scripts/         SEO/内链/IndexNow 校验与提交脚本
└── docs/            旧版静态站历史文件（已废弃，见下）
```

当前有效教程以仓库中的 Markdown 文件为准，`src/` 下的 Astro 站点在构建时读取这些 Markdown 生成 [aixiaobai168.com](https://www.aixiaobai168.com) 上的页面，不需要维护第二份内容。`docs/` 是旧版纯 HTML 静态站的历史文件（2026 年之前的路由器/VPN 主题内容，已长期暂停维护），已整体归档到 [`legacy-site`](https://github.com/wybzsngw/ai-tools-guide/tree/legacy-site) 分支保留查阅，主分支不再提供，也不会恢复。

## 内容原则与版权说明

- 产品能力、命令、配置、价格和支持范围以对应产品的官方资料为事实依据。
- 第三方教程只用于检查选题是否遗漏，不复制其表达、目录、示例、表格、图片或视觉设计。
- 必要的少量引用会明确标注出处并提供原始链接。
- OpenAI、ChatGPT、Codex、Cursor 等名称与商标归各自权利人所有；本项目为非官方中文教程，不代表相关厂商。
- 内容由 AI 辅助起草；发布前应由维护者依据官方资料完成人工复核。实际使用前仍应核对最新官方资料和产品界面。

## 许可与转载

本仓库采用双许可：

| 部分 | 许可 | 说明 |
| --- | --- | --- |
| `scripts/` 等代码 | [Apache-2.0](LICENSE) | 保留版权与许可声明即可使用 |
| 教程正文与原创示例 | [CC BY 4.0](LICENSE-docs.md) | 可转载、改编、商用，但必须署名并链回原文 |

转载教程正文时，请标明原作者 `wybzsngw`、原文链接、CC BY 4.0 协议，改动过的还需说明「有修改」。详细范围、例外情形与署名格式见 [LICENSE-docs.md](LICENSE-docs.md)。

文中标注出处的第三方引用内容，以及各厂商的名称与商标，不在上述授权范围内。

## 更新日志

### 2026 年 9 月

- 仓库改名为 `ai-tools-guide`（原名 `router-vpn`，GitHub 已自动为旧地址建立跳转，历史 star/fork/Issue/PR 不受影响）。
- 新增 Astro 混合内容站点（`src/`），教程正式发布在 [aixiaobai168.com](https://www.aixiaobai168.com)；旧版纯 HTML 静态站归档到 `legacy-site` 分支。
- 全面校准 ChatGPT/OpenAI API 与 Cursor 教程。
- 澄清许可：代码沿用 Apache-2.0，教程正文改为 CC BY 4.0，并补充转载说明。
- 新增 OpenAI Codex 专题入口与 4 篇核心教程。
- 新增 DeepSeek 接入 Codex 进阶教程，覆盖安全配置、验证、费用边界与回滚。
- 更新仓库定位、目录结构、内容原则和非官方声明。
- 修正首页教程链接，并明确 Markdown 为当前有效内容载体、静态站暂停。

### 2026 年 7 月

- 仓库内容收口为 AI 编程与对话工具文档。

### 2026 年 5 月

- 新增 Cursor AI 编程系列：完整指南与实战连载。
- 校准 ChatGPT 与 OpenAI API 内容。

## 免责声明

本教程仅供学习和研究使用。请遵守所在地法律法规、组织政策及各产品服务条款，并自行评估命令执行、账号、费用和数据安全风险。

## 站点配置

新版 Astro 站点（`feat/site-relaunch` 分支）用到几个可选环境变量（Google Search Console 验证、Cloudflare Web Analytics、广告开关），
默认都不设置也能正常构建。凭证获取方式、如何填入见 [SETUP.md](SETUP.md)。

## 反馈与贡献

- 文档问题请提交 [Issue](https://github.com/wybzsngw/ai-tools-guide/issues)。
- 欢迎提交 Pull Request。

**最后核验 / 更新时间：2026 年 9 月。**
