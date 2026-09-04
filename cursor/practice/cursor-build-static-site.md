---
title: "用 Cursor 上线网站：GitHub Pages + 自定义域名"
description: "零基础教程：用 Cursor Agent 对话生成个人静态网站，通过编辑器内置 Git 面板推送到 GitHub 并开启 GitHub Pages 免费托管，再在 Cloudflare 注册域名、配置 DNS 记录绑定自定义域名，最后说明用 Agent 持续维护网站内容、样式与新增页面的日常协作方法与成本预算。"
pubDate: "2026-07-23T11:58:47+08:00"
updatedDate: "2026-09-03T15:42:03+08:00"
category: "cursor"
tags: ["Cursor", "GitHub Pages", "自定义域名", "建站"]
draft: false
order: 2
---

# 用 Cursor 上线网站：GitHub Pages + 自定义域名

> [Cursor 推广链接](https://cursor.com/referral?code=Y3RXKKUGMJ2G)：优惠与适用条件以结账页实际显示为准。

**摘要**：手把手教你用 Cursor AI 写网站、用 GitHub Pages 免费托管、用 Cloudflare 注册域名并绑定——全程不需要懂代码，用 Cursor 和 AI 对话就能完成。

**关键词**：Cursor 写网站、GitHub Pages、自定义域名、Cursor 上线网站、Cursor GitHub、AI 建站

---

## 一、先说清楚成本（不骗人）

| 项目 | 费用 | 说明 |
| --- | --- | --- |
| GitHub 账号 | **免费** | GitHub Pages 公开仓库免费托管 |
| Cursor | Hobby 免费；Pro $20/月起 | 免费档能力与可用模型以账户实际显示为准；本教程不要求固定套餐 |
| 域名（可选）| **约 ¥70–100 / 年** | 想用 `yourdomain.com` 就要买；用 `yourname.github.io` 完全免费 |
| Cloudflare（DNS / CDN） | **免费** | DNS 管理、CDN 加速 |

**结论**：只做技术展示的话，**一分钱不花**也能上线（`yourname.github.io` 免费子域名）。想用自己的域名，全年成本约 ¥70–300。

**是否需要付费套餐？**

纯 HTML/CSS 静态站可以先用 Hobby 档尝试；复杂多文件任务会消耗更多 Agent 用量。Pro 为 $20/月，并包含 Cursor Models 与 Other Models 两个用量池。当前系列包括 Composer 2.5、Grok 4.6、Claude Sonnet 5、Claude Opus 5 与 GPT-5.6 Sol/Terra/Luna；具体可用模型和额度以 [官方模型页](https://cursor.com/docs/models-and-pricing) 与账户用量页为准。

---

## 二、准备工作

### 2.1 注册 GitHub 账号

访问 [github.com](https://github.com) 注册账号（邮箱 + 密码即可），用你的英文名或昵称起一个 GitHub 用户名，这将成为你免费子域名的一部分：`https://你的用户名.github.io`。

### 2.2 安装并开通 Cursor

1. 下载安装 Cursor（支持 Windows / macOS / Linux）。
2. 登录账号；如使用[推广链接](https://cursor.com/referral?code=Y3RXKKUGMJ2G)，优惠以结账页显示为准。
3. 在模型选择器和用量页确认当前套餐可用的模型。

### 2.3 在 Cursor 里连接 GitHub 账号

Cursor 提供 Git 与 GitHub 工作流界面，但底层仍需要可用的 Git。若源代码管理功能提示找不到 Git，请按 [Git 官方说明](https://git-scm.com/downloads) 安装并重启 Cursor。

在 Cursor 中：**菜单 → 文件 → 首选项 → 设置**，搜索「GitHub」，按提示完成 GitHub 账号授权（会弹出浏览器让你登录 GitHub 并授权 Cursor）。授权完成后，Cursor 的源代码管理面板就可以直接发布和同步仓库了。

---

## 三、用 Cursor 创建网站（不用写代码）

### 3.1 新建本地文件夹

在你电脑上建一个文件夹，比如 `my-website`，然后用 Cursor 打开它（**文件 → 打开文件夹**）。

### 3.2 用 Agent 模式让 Cursor 自己写代码

从侧栏打开 Agent，或在 Command Palette 搜索 Agent 相关命令，然后把模式切到 **Agent**。界面位置和快捷键可能变化，请以当前版本的命令面板与键盘快捷方式设置为准；模型从输入框附近的模型选择器选择。

Agent 模式和普通问答最大的区别是：它会自己创建文件、自己执行命令、看到报错自己改，你只负责描述要什么、在它弹窗时点"同意运行"。

把下面这段话发给它：

> 我想做一个个人展示网站，用纯 HTML/CSS，不要任何构建工具和 Node.js，直接放 GitHub Pages 就能跑。
>
> 帮我生成：
> 1. `index.html`：个人主页，包含自我介绍、技能、联系方式
> 2. `style.css`：现代简洁、响应式布局，色调清爽不花哨
> 3. `README.md`：项目说明
>
> 占位文字你随意写，我后面自己改。

Agent 会自己在左侧文件树里建好这三个文件，整个过程你不用复制粘贴任何代码。

### 3.3 让 Agent 持续帮你改内容

接下来想改什么，直接在 Chat 里说，例如：

> 把 index.html 里的自我介绍改成：我是一名摄影爱好者，喜欢旅行和记录生活……

或者选中 HTML 文件里的某段内容，从 Command Palette 搜索 **Inline Edit** 做原地编辑；当前快捷键以键盘快捷方式设置页为准。它只改选中的部分，比全局 Agent 更精准。

Agent 改完会用左侧差异视图展示给你，确认无误点接受即可。改错了或者觉得风格不对，再用一句话让它重做一遍，比手改快很多。

### 3.4 本地预览效果

**方法 A（推荐）**：在 Cursor 的扩展市场里安装 **Live Server** 插件，右键 `index.html` → Open with Live Server，浏览器自动打开预览。

**方法 B**：直接双击 `index.html` 文件，用浏览器打开查看效果。

---

## 四、通过 Cursor 界面推送到 GitHub（不用命令行）

不需要打开终端、不需要背命令，Cursor 的界面就能完成所有 Git 操作。

### 4.1 初始化本地仓库并发布到 GitHub

点击左侧 **源代码管理图标**（看起来像树枝分叉的图标，快捷键 `Ctrl+Shift+G`）：

1. 点击 **「初始化仓库」**（Initialize Repository）
2. 在消息框输入提交说明，例如：`网站首版`
3. 点击 **「提交」**（Commit）旁边的下拉箭头 → **「提交并推送」**
4. 第一次会弹出「发布分支」选项：选择 **「发布到 GitHub」** → 输入仓库名（例如 `my-website`）→ 选择「公开仓库」（Public）→ 确认

Cursor 会自动在你的 GitHub 账号下创建仓库并推送所有文件，不需要你手动操作任何命令行。

### 4.2 后续更新怎么推送

每次修改文件后，在源代码管理面板：

1. 在消息框输入更新说明（例如：`更新联系方式`）
2. 点击 **「提交并推送」**（Commit & Push）

就这两步，改了什么就推什么，GitHub 上会实时更新。

---

## 五、开启 GitHub Pages（免费托管上线）

推送完成后，在 GitHub 网站上：

1. 进入你刚创建的仓库（`github.com/你的用户名/my-website`）
2. 点击上方的 **Settings**（设置）标签
3. 左侧菜单找到 **Pages**
4. **Source** 选择 `Deploy from a branch`
5. **Branch** 选择 `main`，目录选 `/ (root)`
6. 点击 **Save**

等 1–2 分钟后，GitHub 会给你一个 URL：`https://你的用户名.github.io/my-website`

用这个 URL 就能访问你的网站了，完全免费，不需要服务器。

> 📝 如果仓库名就叫 `你的用户名.github.io`（格式完全一致），访问地址会直接是 `https://你的用户名.github.io`，更简洁。

---

## 六、注册域名（想要 yourname.com 的话）

如果想用自己的域名，推荐在 **Cloudflare Registrar** 注册，原因：价格透明无加价（成本价转售），DNS 管理与域名在同一个面板，后续绑定最省事。

### 6.1 在 Cloudflare 注册域名

1. 访问 [cloudflare.com](https://cloudflare.com) 注册免费账号
2. 左侧菜单 → **Domain Registration**（域名注册）→ 搜索你想要的域名
3. 选择 `.com`（约 $10/年）或其他后缀，结账付款
4. 注册完成后，该域名的 DNS 管理自动在 Cloudflare，无需额外配置

国内支付：Cloudflare 结账页通常支持 Visa / Mastercard 双标卡、PayPal 等方式。能否成功付款取决于 Cloudflare 当时显示的支付方式、发卡行跨境/在线支付设置、账户地区与风控结果，本文不对任何付款方式的成功率作承诺。

---

## 七、绑定自定义域名到 GitHub Pages（重点：只用一套系统）

**正确做法**：域名 → Cloudflare DNS → GitHub Pages（托管）

不要同时开 Cloudflare Pages 和 GitHub Pages，这会造成两套系统并行、域名指向混乱。

### 7.1 GitHub 仓库设置自定义域名

1. 进入 GitHub 仓库 → **Settings → Pages**
2. 在 **Custom domain** 栏填入你的域名，例如 `www.yourdomain.com`
3. 点击 **Save**
4. 勾选 **Enforce HTTPS**

GitHub 会自动为你申请 SSL 证书（Let's Encrypt），等几分钟即可。

### 7.2 在 Cloudflare DNS 添加 CNAME 记录

登录 Cloudflare → 选中你的域名 → **DNS → 记录 → 添加记录**：

| 类型 | 名称 | 内容 | 代理状态 |
| --- | --- | --- | --- |
| CNAME | www | 你的用户名.github.io | **仅 DNS**（灰色云朵，不开代理！） |

> 初次验证域名和签发证书时，建议先设为「**仅 DNS**」（灰色云朵）。Cloudflare 代理会改变解析与 TLS 路径，可能让排障更复杂；验证完成后若要启用代理，应按 GitHub Pages 与 Cloudflare 的当前文档重新核对配置。

### 7.3 验证绑定成功

等 5–10 分钟 DNS 生效后：

- 访问 `https://www.yourdomain.com` 能看到你的网站
- 浏览器地址栏显示锁头图标（HTTPS 正常）
- GitHub Pages 设置页面显示「Your site is live at...」并无警告

### 7.4 根域名（yourdomain.com 不带 www）

如果同时想让 `yourdomain.com`（不带 www）也能访问，在 Cloudflare DNS 再添加：

| 类型 | 名称 | 内容 | 代理状态 |
| --- | --- | --- | --- |
| CNAME | @ | 你的用户名.github.io | **仅 DNS** |

在 GitHub Pages 的 Custom domain 中填写你选择的规范域名，并为根域名与 `www` 分别配置 GitHub 当前文档要求的 DNS 记录。跳转行为取决于两侧 DNS 记录和 GitHub Pages 配置，不要只依赖自动推断。

---

## 八、用 Cursor 持续维护网站

网站上线只是开始，日常维护同样不用写代码——继续把 Agent 当成"会自己动手的实习生"用就行。

**添加新页面**：在 Chat 里说"加一个 `blog.html` 博客列表页，样式和首页保持一致"，Agent 自己建文件、自己写、自己提示你预览，确认后在源代码管理面板提交推送。

**修改样式**：直接描述效果，例如"把导航栏背景改成深蓝色、字号小一档、移动端折叠成汉堡菜单"，让 Agent 一次改完。

**排查问题**：网站显示不对？把现象描述给 Agent（最好附上截图或控制台报错），它会自己读相关文件、定位原因、改完跑预览验证。如果一次没修对，再说一句"还是不对，xx 元素位置偏了"，它会接着调，整个循环不用你动手。

**用得久一点的小技巧**：

- 在仓库根部放一份 `AGENTS.md`，写清楚约定（命名风格、色板、字体、文件组织）；它是纯 Markdown 项目指令，不等同于 Skills 或 `.cursor/rules`
- 模型按任务难度、当前可用性和用量成本选择，不要依赖旧型号名称
- 遇到 Agent 反复卡同一个错（一般是它对版本理解错了），在 prompt 里**明确写版本号**，比如"按 11ty 3.x 的新 collections API 来"，比反复让它"再试一次"有效得多

**一个常用模板**：

```text
帮我在 index.html 里加一个作品展示区，网格布局，
每张卡片含图片、标题、描述，最多 6 个，
样式跟现有页面保持一致，改完跑一下预览。
```

---

## 相关教程

- [Cursor 国内使用完整教程（注册 / 模型 / Agent 功能）](../cursor-guide.md)
- [Cursor 通过 SSH 连接 Linux 远程开发](./cursor-ssh-linux.md)

---

## 官方来源与声明

最后核验：**2026-09-03**

- [Cursor Models & Pricing](https://cursor.com/docs/models-and-pricing)
- [Prompting Agents](https://cursor.com/docs/agent/prompting)
- [Cursor Rules 与 AGENTS.md](https://cursor.com/docs/context/rules)

本文为原创实战教程，非 Cursor、GitHub 或 Cloudflare 官方文档；内容曾由 AI 辅助校对；发布前应由维护者依据官方资料完成人工复核。第三方产品价格和界面以各自官方页面为准。
