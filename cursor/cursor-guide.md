# Cursor 2026 使用指南：套餐、模型、Agent 与安全

> [Cursor 推广链接](https://cursor.com/referral?code=Y3RXKKUGMJ2G)：是否有优惠、优惠金额与适用套餐，以结账页实际显示为准。

**摘要**：面向新用户的 Cursor 主指南，介绍当前套餐与模型池、Agent 工作方式、Rules / `AGENTS.md` / Skills、Hooks、MCP、Cloud Agents、CLI，以及本地 Agent 的审批与执行安全。

---

<a id="intro"></a>
## 一、Cursor 是什么？

Cursor 是以代码仓库和开发工作流为中心的 AI 编辑器。它既能回答问题，也能搜索项目、编辑文件、运行命令和调用外部工具。它适合建站、编写脚本、排查错误、维护文档和部署应用，但生成结果仍需由使用者审阅和验证。

常见场景：

| 场景 | 典型用法 |
| --- | --- |
| 新建或维护网站 | 让 Agent 创建页面、修改样式、运行预览与测试 |
| 理解代码 | 用 Ask 搜索代码库并解释调用链，不修改文件 |
| 规划复杂改动 | 用 Plan 澄清需求、比较方案并形成实施计划 |
| 批量处理文件 | 先让 Agent 写脚本，再用样本和只读检查验证 |
| 部署与排障 | 读取日志、修改配置、运行构建；高风险动作人工确认 |

---

<a id="plans"></a>
## 二、下载、登录与套餐

从 [Cursor 官网](https://cursor.com/) 下载 Windows、macOS 或 Linux 客户端。登录后可在编辑器设置与用量面板查看当前套餐、可用模型和本周期消耗。

### 个人与团队套餐

以下为 2026-09-03 官方文档列出的月付价格；税费、币种、地区可用性和结账方式以官方结账页为准。

| 套餐 | 价格 | 说明 |
| --- | ---: | --- |
| Hobby | 免费 | 入门体验；具体可用模型与额度可能变化，以模型选择器和用量页为准 |
| Start | ₹649/月，含税 | 仅面向印度开发者；包含 Cursor Models 池，不包含 Other Models 池 |
| Pro | $20/月 | 包含 Cursor Models 与 Other Models 两个池 |
| Pro+ | $60/月 | 两个模型池，包含量高于 Pro |
| Ultra | $200/月 | 面向高用量个人用户；用量仍受官方计费与额度政策约束 |
| Teams Standard | $40/用户/月 | 团队管理与协作能力 |
| Teams Premium | $120/用户/月 | Agent 限额为 Standard 的 5 倍 |
| Enterprise | 自定义 | 面向需要发票、SCIM、优先支持或高级安全控制的组织 |

模型价格不同，同样的 token 数会以不同速度消耗包含量。达到限额后，可按账户可用选项升级套餐或启用按量付费。不要根据旧文章推断固定请求次数。

支付方式、地区限制、税费、教育活动和任何推广优惠，都应在登录后的结账页及官方地区说明中核对。本文不保证支付宝、中国直连、Apple 内购或教育折扣可用。

---

<a id="models"></a>
## 三、模型与两个用量池

Cursor 的付费个人套餐将用量分为两个独立、按月重置的池：

- **Cursor Models**：当前包括 Cursor Grok 4.6、Grok 4.5 与 Composer 2.5，并提供更多包含用量。
- **Other Models**：第三方模型池，按模型 API 价格消耗；Pro、Pro+、Ultra 包含，Start 不包含。

截至核验日，当前主系列包括：

| 模型 | 适合场景 |
| --- | --- |
| Composer 2.5 | 快速迭代、日常编辑与成本敏感任务 |
| Grok 4.6 | Cursor Models 池中的强推理选择 |
| Claude Sonnet 5 | 日常复杂编码、多文件实现与调试 |
| Claude Opus 5 | 高难度架构、审计与复杂推理 |
| GPT-5.6 Sol | GPT-5.6 系列旗舰，适合高难度、长任务 |
| GPT-5.6 Terra | 在能力、速度和成本之间取平衡 |
| GPT-5.6 Luna | 低成本、快速和较轻任务 |

模型列表、上下文窗口、Fast/Thinking 变体和单价会变化。Hobby 免费档不要预设一定能用某个具体模型；直接查看 [Models & Pricing](https://cursor.com/docs/models-and-pricing) 和编辑器当前模型选择器。

---

<a id="interactions"></a>
## 四、Agent、Ask 与 Plan

- **Agent**：可搜索、编辑文件、运行命令及调用工具，适合已经明确要实施的任务。
- **Ask**：面向只读探索和答疑；适合先理解代码或诊断原因。
- **Plan**：先澄清需求和设计步骤，再进入实现；适合跨文件改动或存在明显取舍的任务。

界面与快捷键会随版本、系统和用户键位变化。优先从 Agent 输入框的模式选择器切换，或打开 Command Palette 搜索相应命令；当前绑定以界面和键盘快捷方式设置页为准。

推荐提示词结构：

```text
目标：最终要得到什么
范围：允许改哪些文件，哪些内容不能动
约束：技术版本、安全边界、兼容性要求
验收：要运行哪些测试或看到什么结果
```

使用 `@` 可以附加文件、目录、终端、聊天、Git 差异或浏览器上下文。已知相关文件时再附加；不确定时可让 Agent 自行搜索。

---

## 五、Rules、AGENTS.md 与 Skills

三者相关，但不是同一种机制：

- **Project Rules**：位于 `.cursor/rules/*.mdc`，可按始终应用、智能相关性、文件路径或手动引用生效。
- **`AGENTS.md`**：纯 Markdown 的简洁项目指令；支持仓库根目录和子目录，越具体的目录说明优先。
- **Agent Skills**：以 `SKILL.md` 为入口的可移植任务包，可包含脚本、模板、参考资料和资源，并按需加载或通过 `/技能名` 调用。

Rules / `AGENTS.md` 适合持续约束代码风格、架构和操作边界；Skills 适合可复用、可执行的领域工作流。不要把 `.cursor/rules`、`AGENTS.md` 和 Skill 当作同义词。

Hooks 是另一层确定性机制：在 Agent 生命周期或工具调用前后运行脚本，适合格式化、审计和策略检查。AI 指令和 Hooks 都不应替代操作系统权限、凭据最小化、分支保护或人工审查。

---

## 六、MCP、Cloud Agents 与 CLI

### MCP

MCP 连接外部工具和数据源，可通过 Marketplace 或 `mcp.json` 配置。服务器可能暴露 tools、prompts、resources 等能力。安装前应核验来源、权限与代码；令牌使用最小权限并通过环境变量传入。

### Cloud Agents

Cloud Agents 在 Cursor 管理的隔离云端 VM 中克隆仓库、安装依赖、运行测试，并在独立分支工作。它们不依赖本机持续联网，也不等同于 Remote-SSH：Cloud Agent 是否能访问私有服务，取决于其云端环境、出站限制、密钥和私网连接配置。

Cloud Agents 不使用本地 Run Modes，也不会逐项等待本机审批。把仓库指令、项目 Skills、Hooks 和必要环境配置提交到仓库；本机用户目录中的配置不会自动复制到云端。

### Cursor CLI

Cursor CLI 提供 Agent、Plan、Ask 模式，读取 `.cursor/rules`、`AGENTS.md` 和 `mcp.json`，支持恢复会话、worktree、非交互输出及将任务交给 Cloud Agent。具体命令与快捷键以 [CLI 官方文档](https://cursor.com/docs/cli/using) 为准。

---

<a id="security"></a>
## 七、审批与执行安全

本地 Agent 的 **Run Modes** 位于 `Settings > Agents > Approvals & Execution`：

| 模式 | 核心行为 |
| --- | --- |
| Auto-review | allowlist 中的调用直接运行；其他调用尽量进入沙箱或由分类器审查 |
| Allowlist | 仅 allowlist 中的动作自动运行，可结合终端沙箱 |
| Run Everything | 所有工具调用自动运行，无沙箱和分类器；风险最高 |

`permissions.json` 用自然语言提示 Auto-review 倾向放行或拦截哪些调用，是便利配置，**不是安全边界**。分类器也可能误判。`sandbox.json` 控制沙箱可访问的路径与网络，两者职责不同。

不要只按命令是否写入来预测审批结果。实际行为由 Run Mode、allowlist、沙箱能力、团队策略、保护机制及当次审批共同决定。对生产部署、删除数据、修改系统服务、写入凭据和不可逆 Git 操作，应使用最小权限、备份、版本控制和人工复核。

---

<a id="troubleshooting"></a>
## 八、常用工作流与故障排查

1. **先说明模式**：只想分析就明确“不要修改文件”；要实施则列出可改范围和验收。
2. **审阅差异**：Agent 的文件修改会写入磁盘；用 Git 或差异视图逐项复核。
3. **验证结果**：运行相关测试、构建或最小复现，不以 Agent 的口头结论代替证据。
4. **控制上下文**：优先引用关键文件，长会话及时总结，避免把无关大文件全部附加。

常见问题：

- **登录或订阅状态异常**：重新登录并查看账户/用量页；仍不一致时通过官方支持渠道提交订单信息。
- **模型不可选或请求失败**：先查看套餐、两个用量池、团队模型策略和状态页，再检查本机网络；不要据此推断某地区或某供应商必然被阻断。
- **规则未生效**：确认 Project Rule 使用 `.mdc` 且触发条件正确；`AGENTS.md` 放在对应目录；Skill 文件夹包含有效 `SKILL.md`。
- **工具执行未询问**：立即检查当前 Run Mode、allowlist、团队策略及保护设置；必要时切回 Allowlist 或 Auto-review。

---

## 九、实战教程

- [GitHub Pages + 自定义域名上线静态站](./practice/cursor-build-static-site.md)
- [通过 SSH 连接 Linux 远程开发](./practice/cursor-ssh-linux.md)
- [阿里云 ECS 部署 Web 应用](./practice/cursor-aliyun-deploy.md)
- [Agent 全栈小应用实战](./practice/cursor-fullstack-app.md)
- [MCP 与 CLI 的工具取舍](./practice/cursor-cli-vs-mcp.md)
- [用 Agent 辅助排查 Windows 系统](./system-ops/cursor-fix-windows-system.md)

---

## 官方来源与声明

最后核验：**2026-09-03**

- [Cursor 文档](https://cursor.com/docs)
- [Models & Pricing](https://cursor.com/docs/models-and-pricing)
- [Agent Skills](https://cursor.com/docs/skills)
- [Rules](https://cursor.com/docs/context/rules)
- [Run Modes](https://cursor.com/docs/agent/security/run-modes)
- [MCP](https://cursor.com/docs/context/mcp)
- [Cloud Agents](https://cursor.com/docs/cloud-agent)
- [Cursor CLI](https://cursor.com/docs/cli/using)

本文为原创中文整理，非 Cursor 官方文档；内容曾由 AI 辅助校对；发布前应由维护者依据官方资料完成人工复核。产品、价格和界面可能继续变化，请以官方页面与账户实际显示为准。
