# OpenAI API 入门：Responses API、密钥与成本控制

本文面向第一次把 OpenAI 接入服务端程序的开发者。推荐从 Responses API 开始：先安全保存 API key，完成一次最小调用，再设置预算和用量监控。API 的可用地区、模型、限额与价格会变化，部署前应重新查阅官方页面。

## 目录

- [API 与 ChatGPT 订阅是两套产品](#api-与-chatgpt-订阅是两套产品)
- [开始前的准备](#开始前的准备)
- [创建并保护 API key](#创建并保护-api-key)
- [用 Responses API 完成第一次调用](#用-responses-api-完成第一次调用)
- [理解 token 与工具计费](#理解-token-与工具计费)
- [2026-09-03 模型价格快照](#2026-09-03-模型价格快照)
- [设置预算与控制成本](#设置预算与控制成本)
- [上线前检查](#上线前检查)
- [官方来源与说明](#官方来源与说明)

## API 与 ChatGPT 订阅是两套产品

ChatGPT Free、Go、Plus 或 Pro 管理的是 ChatGPT 网页和应用内体验。OpenAI API 则通过开发者平台调用，按 API 用量独立计费：

- Plus 的 $20/月订阅费不包含 API token。
- API 余额或账单不会自动提供 ChatGPT 付费方案。
- 两边即使使用同一登录账号，也应分别查看套餐和账单。

ChatGPT 套餐请参阅 [ChatGPT 订阅指南](./chatgpt-plus-guide.md)。

## 开始前的准备

1. 确认 OpenAI API 在你的所在地受到支持，并遵守当地法律和 OpenAI 条款。本文不提供绕过地区限制的方法。
2. 登录 <https://platform.openai.com/>，创建或选择用于开发的项目。
3. 在项目内设置账单、预算和成员权限。账户实际可用的充值或后付费方式以 Billing 页面为准。
4. 安装 Node.js 18 或更高版本，或者准备能发送 HTTPS 请求的服务端环境。

不要假设新账户一定有免费额度，也不要依据第三方教程判断最低充值金额、信用额度或付款成功率；这些信息应以账户内页面为准。

## 创建并保护 API key

在开发者平台的 API keys 页面创建项目密钥。密钥只应提供给需要调用 API 的服务端：

1. 选择正确的项目并创建新的 secret key。
2. 立即存入密码管理器或部署平台的 secrets 管理功能。
3. 只授予必要权限，并为开发、测试、生产使用不同项目或密钥。
4. 定期查看用量；一旦怀疑泄露，立即撤销旧 key、创建新 key，并检查异常请求和账单。

以下做法不安全：

- 把 key 写进浏览器端 JavaScript、移动应用包或公开仓库；
- 把 `.env` 提交到 Git；
- 在截图、日志、聊天记录或报错响应中输出完整 key；
- 多人长期共用同一把个人 key。

在 PowerShell 中为当前终端设置环境变量：

```powershell
$env:OPENAI_API_KEY = "你的 API key"
```

生产环境应使用托管平台的 secret 配置，不要把真实 key 硬编码进源文件。

## 用 Responses API 完成第一次调用

Responses API 是新项目的推荐入口。它提供统一的文本生成与工具调用接口，也便于在后续加入推理参数和工具。

### JavaScript 最小示例

在空目录中安装官方 SDK：

```bash
npm install openai
```

新建 `example.mjs`：

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await client.responses.create({
  model: "gpt-5.6-sol",
  input: "用一句简体中文解释什么是幂等性。",
});

console.log(response.output_text);
```

在已设置 `OPENAI_API_KEY` 的终端运行：

```bash
node example.mjs
```

模型标识、访问权限或推荐型号可能变化。若示例中的模型不对你的项目开放，请在官方模型页选择账户可用模型，不要在代码中静默回退到未知模型。

### 等价的 curl 请求

```bash
curl https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model":"gpt-5.6-sol","input":"用一句简体中文解释什么是幂等性。"}'
```

上面的写法适用于 Bash。Windows PowerShell 用户可直接使用 JavaScript 示例，避免 PowerShell 对 `curl` 别名、引号和环境变量语法的版本差异。

## 理解 token 与工具计费

一次请求的成本可能包含：

- **输入 token**：发送给模型的指令、上下文和工具结果；
- **缓存输入 token**：符合提示缓存条件并命中缓存的输入；
- **缓存写入 token**：写入缓存的内容；
- **输出 token**：模型生成的文本或推理相关输出；
- **工具费用**：例如 Web search 按调用次数另行计费。

不要用“一个汉字固定等于几个 token”估算账单。分词结果取决于文本、模型和编码方式；应结合请求返回的 usage 数据和项目用量页测量真实工作负载。

截至 2026-09-03，Web search 的价格是 **$10 / 1,000 次调用，另加模型 token 费用**。一次业务请求可能触发不止一次工具调用，应按实际 usage 统计。

## 2026-09-03 模型价格快照

下表单位均为 **美元 / 100 万 token**。短、长上下文采用官方定价页的分类；实际请求落入哪一档，应以当前模型说明、上下文规则和账单为准。

| 模型与上下文档 | 输入 | 缓存输入 | 缓存写入 | 输出 |
| --- | ---: | ---: | ---: | ---: |
| gpt-5.6-sol，短上下文 | $4.00 | $0.40 | $5.00 | $20.00 |
| gpt-5.6-sol，长上下文 | $8.00 | $0.80 | $10.00 | $30.00 |
| gpt-5.6-terra，短上下文 | $2.00 | $0.20 | $2.50 | $12.00 |
| gpt-5.6-terra，长上下文 | $4.00 | $0.40 | $5.00 | $18.00 |
| gpt-5.6-luna，短上下文 | $0.20 | $0.02 | $0.25 | $1.20 |
| gpt-5.6-luna，长上下文 | $0.40 | $0.04 | $0.50 | $1.80 |

**gpt-5.6-sol 当前为促销价，官方说明该价格至少持续到 2026-11-21。**“至少持续到”不代表该日期之后一定涨价或保持不变。所有价格都可能调整，采购、报价或上线前必须查看 [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing)。

本文不保留“Batch 固定节省 50%”之类静态承诺。是否提供 Batch、折扣比例及适用模型，以调用时的官方定价页和 Batch 文档为准。

## 设置预算与控制成本

建议在第一次调用前完成这些设置：

1. 在项目账单或 Limits 页面设置月度预算和通知阈值，例如 50%、80%、100%。
2. 确认预算是提醒还是硬性停止机制；不要把告警当成绝对的实时断路器。
3. 为不同环境和团队拆分项目，便于归因、撤销密钥和限制权限。
4. 在应用层限制单次最大输出、并发数、重试次数和可调用工具。
5. 记录响应中的 usage 与请求 ID，建立按用户、功能和模型的成本日志。
6. 对重复且稳定的长前缀评估提示缓存；对长上下文请求先裁剪无关内容。
7. 设置异常用量告警，发现突增时先停用相关 key，再调查调用来源。

粗略估算纯模型成本时，可使用：

```text
总成本 =
输入 token / 1,000,000 × 输入单价
+ 缓存输入 token / 1,000,000 × 缓存输入单价
+ 缓存写入 token / 1,000,000 × 缓存写入单价
+ 输出 token / 1,000,000 × 输出单价
+ 工具调用费用
```

实际账单还应以开发者平台显示为准。

## 上线前检查

- key 只存在于服务端 secret 管理系统，并已排除在版本控制之外；
- 测试了超时、限流、API 错误和有限次数的退避重试；
- 对用户输入、模型输出和工具权限设置了适合业务的安全边界；
- 记录 usage，但日志不包含 key 或不必要的个人数据；
- 已核对模型的上下文限制、推理参数和最新变更；
- 已设置预算、告警，以及发现密钥泄露时的撤销流程。

若主要在 IDE 中使用 AI 而不是开发自己的服务，可阅读 [Cursor 指南](../cursor/cursor-guide.md)。有关 OpenAI Codex，请参阅 [Codex 专题](../codex/README.md)。

## 官方来源与说明

最后核验日期：**2026-09-03**

官方资料：

- [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing)
- [gpt-5.6-sol 模型说明](https://developers.openai.com/api/docs/models/gpt-5.6-sol)
- [Reasoning models guide](https://developers.openai.com/api/docs/guides/reasoning)
- [API changelog](https://developers.openai.com/api/docs/changelog)

本文是非官方中文教程，不代表 OpenAI，也不构成价格、额度、地区可用性或付款结果的保证。内容由 AI 辅助编写；发布前应由维护者依据官方资料完成人工复核。如本文与 OpenAI 官方资料或账户内页面不一致，以官方信息为准。
