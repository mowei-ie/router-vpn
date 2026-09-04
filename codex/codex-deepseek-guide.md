---
title: "在 OpenAI Codex 中使用 DeepSeek：安全配置、验证与回滚"
description: "第三方模型接入进阶篇：说明在 OpenAI Codex 中接入 DeepSeek 涉及的外壳层与模型层数据边界，通过独立 profile 隔离配置、安全备份整个 CODEX_HOME、用 env_key 而非明文写入密钥，并给出分层验证顺序、常见故障排查方法与可撤销回滚的完整操作步骤与安全检查清单。"
pubDate: "2026-09-03T16:49:20+08:00"
updatedDate: "2026-09-03T16:49:20+08:00"
category: "codex"
tags: ["OpenAI Codex", "DeepSeek", "第三方模型集成", "安全配置"]
draft: false
order: 5
---

# 在 OpenAI Codex 中使用 DeepSeek：安全配置、验证与回滚

把 DeepSeek 接入 Codex，实际组合的是两层能力：

- **外壳层**：OpenAI Codex Agent、CLI/IDE 工具、审批与沙箱机制。
- **模型层**：DeepSeek 模型、API 凭据、服务条款和按 DeepSeek 规则产生的费用。

因此，这不是在使用 OpenAI 模型，也不会消耗 ChatGPT 订阅额度。能在本地 Codex
客户端调用第三方模型，不代表 Codex Cloud、GitHub Code Review、Slack 集成或其他
OpenAI 云能力会自动支持同一配置。云端能力是否可用，必须分别查看当时的 OpenAI
官方说明。

> **数据边界先于配置。** 发送给模型的代码、提示词、工具结果和上下文会由第三方
> 模型提供方接收。不得把私有仓库、客户数据、密钥或受监管信息发送给未经组织批准的
> provider。Codex 的沙箱主要约束本地工具执行，并不能阻止你主动放入提示词的内容
> 被发往模型 API。

本文按“理解边界 → 隔离配置 → 安全设置 → 验证 → 回滚”展开，适用于截至 **2026-09-03** 的官方行为。

## 一、先理解当前兼容层

DeepSeek 当前官方 Codex 集成列出三个模型：

- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `deepseek-v4-flash-vision-exp`

其中 vision 实验模型的目录元数据声明了图片输入能力。集成不只是改一个模型名，还依赖：

1. `~/.codex/models.json` 中由 DeepSeek 提供的模型目录；
2. `config.toml` 中指向该文件的 `model_catalog_json`；
3. 自定义 provider 通过 Responses 协议访问 DeepSeek API。

`models.json` 描述上下文窗口、输入模态、工具调用等兼容信息。它和上述模型名属于 **DeepSeek 当前维护的 Codex 兼容层**，以后可能变化；不要凭经验自行拼一份，也不要把某次下载的版本永久当成规范。

本文不复制 DeepSeek 官方约 100KB 的完整 `models.json`、其中的长 system
instructions，也不镜像完整安装脚本。原因很直接：这些内容易随供应商实现变化，
应由供应商维护；大段转载还会增加版权、审阅和后续同步成本。请始终从
[DeepSeek 官方 Codex 接入页](https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/codex)
取得当前脚本和模型目录内容。

## 二、先备份，再用 profile 隔离

### 1. 确认真正的 CODEX_HOME

Codex 默认使用 `~/.codex`，也可由 `CODEX_HOME` 改写。Windows 原生 Codex 与 WSL 中的 Codex 是两个环境：

- Windows 原生的 `~` 通常是 Windows 用户目录；
- WSL 的 `~` 是该 Linux 发行版中的用户主目录；
- 两边的环境变量、配置、模型目录和会话默认互不相同。

先在你实际运行 Codex 的同一个终端确认目录，不要在 Windows 中配置一份却期待 WSL 自动读取。

PowerShell：

```powershell
$codexHome = if ($env:CODEX_HOME) {
    $env:CODEX_HOME
} else {
    Join-Path $HOME ".codex"
}
$codexHome
```

macOS/Linux：

```bash
codex_home="${CODEX_HOME:-$HOME/.codex}"
printf '%s\n' "$codex_home"
```

### 2. 备份整个目录

官方脚本会修改 `config.toml` 和 `models.json`。执行脚本或手动编辑前，应备份 **整个** `CODEX_HOME`，因为只备份一个配置文件不足以覆盖模型目录和其他本地状态。

PowerShell：

```powershell
$backup = "$codexHome.backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
Copy-Item -LiteralPath $codexHome -Destination $backup -Recurse
$backup
```

macOS/Linux：

```bash
backup="${codex_home}.backup-$(date +%Y%m%d-%H%M%S)"
cp -a "$codex_home" "$backup"
printf '%s\n' "$backup"
```

确认输出目录存在且能打开，再继续。

备份目录本身也是敏感数据：其中可能包含 `auth.json`、会话记录和 MCP 凭据。不要将
备份提交到 Git、上传到公共网盘或附在工单中；应限制其访问权限，并在配置稳定且超过
必要的恢复期限后安全删除不再需要的旧备份。

### 3. 推荐独立 profile

不要直接覆盖日常使用的默认配置。把 DeepSeek 配置放到：

```text
~/.codex/deepseek.config.toml
```

然后显式启动：

```text
codex --profile deepseek
```

Codex 官方配置参考规定，profile 文件与主 `config.toml` 同目录，命名为
`$CODEX_HOME/<profile>.config.toml`。这样可以降低第三方 provider 影响默认登录、
默认模型和现有工作流的概率，也让停用与排错更清晰。

profile 只能隔离配置选择，**不会自动生成模型目录**。`model_catalog_json` 指向的
`models.json` 仍须按 DeepSeek 官方方案下载、生成或更新。

## 三、安全准备 models.json 与脚本

### 方案 A：隔离手动配置

从 DeepSeek 官方接入页取得当前 `models.json` 内容，保存到当前环境的 `$CODEX_HOME/models.json`。不要从博客、网盘或不明仓库下载，也不要自行删改其中的长指令后假设仍兼容。

这种方式适合重视凭据安全、配置隔离和可回滚性的用户，但手工处理大型 JSON 也可能
出错，并不一定比官方脚本更适合初学者。

随后检查 JSON 至少能被解析。

PowerShell：

```powershell
Get-Content -LiteralPath (Join-Path $codexHome "models.json") -Raw |
    ConvertFrom-Json | Out-Null
```

macOS/Linux（需要 `python3`）：

```bash
python3 -m json.tool "$codex_home/models.json" >/dev/null
```

### 方案 B：确需使用官方一键脚本

不要把网络响应直接管道给解释器。先从 DeepSeek 官方接入页核对当前下载地址，再按以下方式落盘、查看哈希、人工检查，最后本地执行。

Windows PowerShell：

```powershell
$scriptPath = Join-Path ([IO.Path]::GetTempPath()) "codex-deepseek-setup.ps1"
Invoke-WebRequest `
    -Uri "https://cdn.deepseek.com/api-docs/codex-deepseek-setup-en.ps1" `
    -OutFile $scriptPath
Get-FileHash -Algorithm SHA256 -LiteralPath $scriptPath
notepad.exe $scriptPath
```

关闭编辑器后，确认下载域名、文件内容、哈希记录和备份均无误，再本地执行：

```powershell
$answer = Read-Host "已审阅脚本并确认执行？输入 YES"
if ($answer -eq "YES") {
    & $scriptPath
}
```

macOS/Linux：

```bash
script_path="$(mktemp -t codex-deepseek-setup.XXXXXX)"
curl -fL -o "$script_path" \
  "https://cdn.deepseek.com/api-docs/codex-deepseek-setup.sh"
shasum -a 256 "$script_path"
less "$script_path"
```

上例中的 `shasum` 通常适用于 macOS；部分 Linux 发行版使用 `sha256sum`。可按当前
环境自动选择：

```bash
if command -v sha256sum >/dev/null; then
  sha256sum "$script_path"
else
  shasum -a 256 "$script_path"
fi
```

审阅后明确确认，再本地执行：

```bash
printf '已审阅脚本并确认执行？输入 YES: '
read -r answer
[ "$answer" = "YES" ] && bash "$script_path"
```

哈希只有在能与供应商通过独立可信渠道发布的预期值比对时，才能验证发布物；如果官方没有发布预期摘要，`Get-FileHash`/`shasum` 只能帮助你记录“审阅的是哪一个文件”，不能单独证明来源安全。

脚本会修改 `config.toml` 和 `models.json`。即便它当前声称会保留 MCP、项目可信级别等设置，也应以实际 diff 为准；脚本本身和菜单行为可能更新。

## 四、使用 env_key 手动配置

OpenAI Codex 官方自定义 provider 支持用 `env_key` 指定“从哪个环境变量读取
provider API key”，并明确不鼓励把 bearer token 直接写进配置。本文采用：

```toml
model = "deepseek-v4-flash"
model_provider = "deepseek"
model_reasoning_effort = "high"
model_catalog_json = "C:/Users/你的用户名/.codex/models.json"

[model_providers.deepseek]
name = "DeepSeek"
base_url = "https://api.deepseek.com/"
wire_api = "responses"
env_key = "DEEPSEEK_API_KEY"
```

将其保存为 `$CODEX_HOME/deepseek.config.toml`，并把
`model_catalog_json` 替换为当前环境中 `models.json` 的**真实绝对路径**。Windows 的
TOML 路径可使用正斜杠；macOS/Linux 可写成
`/home/你的用户名/.codex/models.json` 等实际路径。不要原样保留示例用户名，也不要
假设所有 Codex 版本都会在该字段中展开 `~`。

这里的 `model_catalog_json` 是 DeepSeek 当前集成方案的一部分，不是让读者自行编造目录文件。

这套 `env_key + profile` 写法是依据 OpenAI Codex 官方自定义 provider 机制，对
DeepSeek 当前接入方式所做的安全化整理，并不是 DeepSeek 官方示例的原样配置。使用前
必须在当前 Codex 与 DeepSeek API 版本上完成下文验证；如果兼容行为变化，应回到双方
官方文档重新核对，而不是继续沿用本文旧配置。

认证方式要保持单一：

- 使用 `env_key` 时，不要再配置 `experimental_bearer_token`；
- 不要与 `[model_providers.deepseek.auth]` 命令认证混用；
- 不要设置 `requires_openai_auth = true`。该选项用于 OpenAI 认证，启用后 Codex 会忽略 `env_key`。

真实 key 不应写入 Markdown、仓库、命令字面量、截图或工单。配置文件里只出现环境变量名。

### Windows 安全输入当前会话

长期使用可通过 Windows“编辑系统环境变量”界面或组织批准的密码管理器/密钥注入工具设置。若只需当前 PowerShell 会话，可隐藏输入：

```powershell
$secureValue = Read-Host "输入 DeepSeek API key（输入不可见）" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
try {
    $env:DEEPSEEK_API_KEY =
        [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
```

这避免把 key 直接留在命令历史，但环境变量不是加密保险箱：当前进程及其子进程可读取它，转换过程中也会短暂产生明文字符串。关闭终端后当前会话变量消失；长期凭据应遵循组织的密钥管理政策。

### macOS/Linux 安全输入当前会话

```bash
printf '输入 DeepSeek API key（输入不可见）: '
read -rs DEEPSEEK_API_KEY
printf '\n'
export DEEPSEEK_API_KEY
```

不要把真实值写进 shell 命令历史、可同步的 shell 配置或提交到 dotfiles。这里同样只是当前进程环境，不是加密存储。

## 五、分层验证，不只看模型显示名

按以下顺序验证，可以更快区分配置、认证、协议和模型行为问题。

1. **备份复核**：确认时间戳备份目录可读，原 `config.toml`、模型目录和必要状态仍在。
2. **语法复核**：用 TOML 感知编辑器检查 `deepseek.config.toml`，并用前述命令
   解析 `models.json`。若 Codex 启动报告 TOML 解析错误，先停止，不要继续改默认配置。
3. **隔离启动**：运行 `codex --profile deepseek`，确保没有悄悄落回默认 provider。
4. **状态检查**：在 Codex 中执行 `/status`，核对 model、provider、当前目录、审批与沙箱设置。
5. **低风险只读任务**：先让它概括一个公开测试仓库中的 README，不修改文件、不访问密钥。
6. **工具调用**：让它列出工作区文件或搜索一个无敏感性的字符串，确认 Responses 兼容层不只是完成纯文本对话。
7. **费用确认**：到 DeepSeek 控制台检查请求、错误和实际用量。计费证据来自 DeepSeek，而不是 ChatGPT 订阅页。

启动横幅或 `/status` 显示了预期模型名，只能证明配置选择的一部分；它不能证明所有工具、图片、长上下文、推理强度、沙箱或客户端形态均完全兼容。

## 六、常见故障

### 401 / 403

检查 `DEEPSEEK_API_KEY` 是否存在于 **启动 Codex 的同一进程环境**，是否已失效、
权限不足或被组织策略拦截。不要为排错把 key 打印到终端或写回配置。若刚设置系统
环境变量，重启终端、桌面端或 IDE，让新进程读取它。

### 模型不可用或目录不识别

重新核对 DeepSeek 官方页面当前列出的模型 slug，并更新其维护的 `models.json`。
模型下线、灰度范围、账户权限或旧目录都可能造成失败；不要随意改 slug 猜测。

### Responses 或工具调用异常

当前 Codex 自定义 provider 的 `wire_api` 仅支持 `responses`。确认 `base_url`、
协议字段和 DeepSeek 当前兼容说明一致。能聊天不等于工具调用完全正确，应保留
最小复现并分别核对 Codex 与 DeepSeek 的当前文档。

### 桌面端或 IDE 没有变化

配置或环境变量更新后，已有进程可能仍持有旧值。完全退出并重启客户端/IDE；同时确认该客户端实际使用的 `CODEX_HOME` 与你编辑的是同一个。

### 切换 provider 后历史会话“消失”

按 DeepSeek 当前官方页面的说明，Codex 会按登录方式分组展示会话：切换 provider 后，另一组历史可能暂时隐藏，并不等于文件被删除。恢复对应配置并重启客户端后可能重新显示。此行为属于当前客户端实现，未来可能变化；回滚前仍应先备份，不能把“通常只是隐藏”当成删除本地数据的理由。

以上排查均以 **2026-09-03** 官方行为为准。版本升级后先查 changelog、配置参考和 DeepSeek 接入页。

## 七、可撤销地回滚

### 使用独立 profile

1. 退出所有 Codex 客户端；
2. 停止使用 `codex --profile deepseek`；
3. 删除或移走 `$CODEX_HOME/deepseek.config.toml`；
4. 从系统设置、密码管理器注入规则或当前会话中移除 `DEEPSEEK_API_KEY`；
5. 重启 Codex，执行 `/status`，确认回到预期的默认 provider。

若 `models.json` 只供该 profile 使用，可在确认没有其他配置引用后将其移出 `CODEX_HOME`；不确定时保留比盲删安全。

PowerShell 当前会话可执行：

```powershell
Remove-Item Env:DEEPSEEK_API_KEY -ErrorAction SilentlyContinue
```

macOS/Linux 当前会话可执行：

```bash
unset DEEPSEEK_API_KEY
```

### 使用 DeepSeek 官方脚本

再次运行你已经审阅并留存哈希的同一官方脚本，按其 **当前菜单** 选择恢复项；截至核验日，官方页面说明菜单第 9 项用于恢复默认 Codex 配置。之后：

- 核对 `$CODEX_HOME/backup-deepseek` 中的备份；
- 比较恢复后的 `config.toml` 与自己的整目录备份；
- 检查 `models.json`、MCP、信任级别、profile 和环境变量；
- 重启客户端并用 `/status` 验证。

不要盲目删除整个 `~/.codex`。其中可能包含登录状态、会话、日志、MCP 和其他无关配置；整目录删除不是正常回滚手段。

## 正式接入前检查清单

- [ ] 已确认自己有权将目标代码与上下文发送给 DeepSeek；涉及公司、客户或组织代码时，已取得相应批准。
- [ ] 已确认 Windows 原生或 WSL 中真正使用的 `CODEX_HOME`。
- [ ] 已备份整个目录，且备份可读。
- [ ] `models.json` 与脚本来自 DeepSeek 官方页面，并保留审阅时的哈希。
- [ ] profile 使用 `env_key`，仓库和配置中没有真实 key。
- [ ] `/status`、只读任务、工具调用和 DeepSeek 控制台用量均已验证。
- [ ] 已记录回滚路径，没有把删除整个 `~/.codex` 当作方案。

## 直接官方来源

- [DeepSeek：接入 Codex](https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/codex)
- [OpenAI Codex：Advanced Configuration](https://developers.openai.com/codex/config-advanced)
- [OpenAI Codex：Configuration Reference](https://developers.openai.com/codex/config-reference)
- [OpenAI Codex：Authentication](https://developers.openai.com/codex/auth)

本文为非官方中文教程，不代表 OpenAI 或 DeepSeek。内容基于直接官方来源重新组织
并原创撰写，没有复制官方完整表格、模型目录、脚本或长提示词。内容由 AI 辅助起草，
发布前必须由维护者依据官方资料进行人工复核；实际操作还应遵守组织政策与相关
服务条款。

**最后核验：2026-09-03。**
