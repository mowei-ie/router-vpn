# Cursor Agent 实战：用 AI 写一个完整的全栈小应用

> [Cursor 推广链接](https://cursor.com/referral?code=Y3RXKKUGMJ2G)：优惠与适用条件以结账页实际显示为准。

**摘要**：用 Cursor Agent 模式从零开始对话，生成一个完整的全栈小应用（以「备忘录 / 短链生成器」为例）：前端 React + 后端 Express + SQLite 数据库，前端部署到 Cloudflare Pages，后端部署到阿里云 ECS。全程用提示词驱动，不需要你手动写代码，让 AI 扮演「实习程序员」把整个项目做出来。

**关键词**：Cursor 全栈、Cursor Agent、Cursor React、Cursor Express、Cursor 数据库、AI 写全栈、Cursor Cloudflare Pages、Cursor 阿里云 ECS、Cursor 全栈教程

---

## 一、需求拆解（用 Cursor Chat 写产品文档）

在开始写代码之前，先用 **Plan** 模式帮你把需求整理清楚。从侧栏或 Command Palette 打开 Agent，再从模式选择器切到 Plan；快捷键以当前键盘快捷方式设置为准。输入：

> 我想做一个「个人短链生成器」：
>
> - 用户输入一个长 URL，系统生成一个短码（如 `abc123`），访问短链 `/s/abc123` 时跳转到原始 URL
> - 管理页面显示所有短链列表，可以查看点击次数、删除条目
> - 不需要用户登录，任何人都能创建短链（个人用，不对外开放）
> - 技术栈：前端 React（单页应用），后端 Node.js Express + SQLite，前端和后端分开部署
>
> 请帮我写一份简洁的需求文档（Markdown 格式），包括：功能列表、API 接口设计、数据库表结构。

Cursor 生成需求文档后，**保存为 `docs/requirements.md`**。这一步的作用是让 AI 先把项目想清楚，后续每次需要调整都可以回到这个文档。

---

## 二、Agent 一次性生成项目骨架

需求确认后，在同一会话切换到 **Agent** 模式实施。旧版 Composer 窗口名称和快捷键已不再作为本文依据；请从当前模式选择器或 Command Palette 操作。

在 Agent 输入框里粘贴：

**任务**：

> 根据 `docs/requirements.md` 的设计，在当前目录生成一个全栈项目，结构如下：
> ```
> short-link/
> ├── frontend/        # React 前端（Vite）
> │   ├── src/
> │   │   ├── App.jsx
> │   │   └── main.jsx
> │   ├── index.html
> │   └── package.json
> ├── backend/         # Node.js Express 后端
> │   ├── server.js
> │   ├── db.js        # SQLite 初始化
> │   └── package.json
> └── README.md
> ```

**约束**：

> - 前端用 React 18 + Vite，不用 TypeScript，不用 CSS 框架（只用内联样式或简单 CSS 文件）
> - 后端用 Express + better-sqlite3，端口 3001
> - 数据库文件 `backend/data.db`，表结构按需求文档
> - 前端开发时通过 Vite proxy 把 `/api` 请求转发到后端 3001
> - 不要生成测试文件

**验收**：

> 进入 `backend/`，`npm install && node server.js` 能跑起来；
> 进入 `frontend/`，`npm install && npm run dev` 能看到页面；
> 访问首页，输入一个 URL，点击「生成短链」，能看到短码

Agent 会自动创建所有文件，期间可能询问你确认某些操作，按实际情况回答即可。

---

## 三、迭代前端（完善 React 页面）

骨架跑通后，在 Chat 里逐步完善 UI。把以下需求分别发给 Cursor：

**第一轮 — 完善首页**：

> 打开 `frontend/src/App.jsx`，帮我完善短链生成表单：
> 1. 输入框宽度铺满，有 placeholder 「粘贴你的长链接」
> 2. 生成后显示短链（带复制按钮，点击后复制到剪贴板，按钮文字变为「已复制 ✓」）
> 3. 如果输入不是合法 URL（不以 http/https 开头），显示红色提示「请输入完整的 URL（以 http:// 或 https:// 开头）」
> 4. 整体样式简洁，以白色卡片为主，中心对齐

**第二轮 — 完善管理列表**：

> 在首页下方加一个「我的短链」列表区域：
> 1. 从 `/api/links` 获取所有短链数据
> 2. 每行显示：短码、原始 URL（截断超过 50 字符显示省略号）、点击次数、删除按钮
> 3. 删除后列表自动刷新
> 4. 列表为空时显示「还没有短链，快来生成第一个吧」

---

## 四、迭代后端（完善 API + 数据库）

**在 Chat 里检查并完善 `backend/server.js`**：

> 检查 `backend/server.js`，确保以下 API 都已实现并能正常工作：
> - `POST /api/links`：接收 `{ url }` → 生成 6 位随机短码（字母+数字）→ 存入 SQLite → 返回 `{ code, shortUrl }`
> - `GET /api/links`：返回所有短链列表（按创建时间降序）
> - `DELETE /api/links/:code`：删除指定短码
> - `GET /s/:code`：跳转（重定向）到原始 URL，同时把该短码的点击次数 +1
> - 所有路由需要处理异常（try/catch），返回规范的 JSON 错误格式 `{ error: "..." }`
>
> 如果有缺失或 Bug，直接修复。

---

## 五、本地联调

前后端都完成后，进行完整联调：

```bash
# 终端 1：启动后端
cd backend && npm start

# 终端 2：启动前端（Vite 开发服务器）
cd frontend && npm run dev
```

打开 `http://localhost:5173`，测试以下场景：

1. 输入 `https://google.com`，点生成，看到短码（如 `abc123`）
2. 访问 `http://localhost:3001/s/abc123`，确认跳转到 `https://google.com`
3. 管理列表里能看到这条记录，点击次数为 1
4. 点删除，列表刷新后该条消失

**如果有 Bug**，直接在 Chat 里描述症状（复制报错信息），Cursor 会帮你排查：

> 点击「生成短链」后控制台报错：`TypeError: Cannot read properties of undefined (reading 'code')`，请帮我找到原因并修复。

---

## 六、前端部署到 Cloudflare Pages（接实战 1）

这一步承接[实战 1《Cursor + GitHub Pages 建站》](./cursor-build-static-site.md)的 GitHub 推送流程。前端是纯静态文件（Vite 构建后），非常适合部署到 Cloudflare Pages。

### 6.1 构建前端

在 `frontend/` 目录执行：

```bash
npm run build
```

会在 `frontend/dist/` 生成静态文件。

### 6.2 修改前端 API 地址为生产环境

构建前先让 Cursor 帮你处理环境变量：

> 在 `frontend/` 下创建 `.env.production` 文件，设置 `VITE_API_BASE=https://your-api-domain.com`（占位，后面改成真实后端地址）；修改 `App.jsx` 里所有 fetch 请求，把硬编码的 `/api` 改为 `${import.meta.env.VITE_API_BASE}/api`。

### 6.3 推送到 GitHub 并接入 Cloudflare Pages

1. 用 Cursor 界面把 `frontend/` 目录推送到一个独立的 GitHub 仓库（如 `short-link-frontend`）
2. 登录 Cloudflare → **Pages → Create a project → Connect to Git**
3. 选择刚推送的仓库
4. 构建设置：
   - **Framework preset**：Vite
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
5. 点 **Save and Deploy**，等 1–2 分钟，Cloudflare Pages 会给你一个 `xxx.pages.dev` 的免费域名

---

## 七、后端部署到阿里云 ECS（接实战 3）

这一步承接[实战 3《Cursor 阿里云 ECS 部署》](./cursor-aliyun-deploy.md)的配置方法，这里只做 Node.js 后端的增量说明。

### 7.1 把后端代码推送到 GitHub

在 Cursor 界面把 `backend/` 目录推送到另一个仓库（如 `short-link-backend`）。

### 7.2 在 ECS 上部署

SSH 连接 ECS 后（参考实战 3），在 ECS 上：

```bash
git clone https://github.com/你的账号/short-link-backend.git ~/short-link
cd ~/short-link
npm install
```

### 7.3 让 Cursor 写 Nginx + PM2 配置

在 Chat 里说：

> 帮我写：
> 1. Nginx 配置：把 `api.your-domain.com` 的请求反向代理到本机 3001 端口，并配置 CORS（允许 Cloudflare Pages 的域名跨域请求）
> 2. PM2 启动命令：用 `pm2 start server.js --name short-link`，并设置开机自启

**处理跨域**：由于前端在 Cloudflare Pages，后端在 ECS，需要让后端允许跨域请求。在 Chat 里说：

> 在 `backend/server.js` 里添加 CORS 配置，允许来自 `https://xxx.pages.dev` 和 `https://your-domain.com` 的跨域请求，使用 `cors` 包实现。

### 7.4 配置 GitHub Actions 自动部署（复用实战 3 流程）

参考实战 3 的 GitHub Actions 配置，把 `short-link-backend` 仓库也接入自动部署。

---

## 八、运行效果与复盘

### 8.1 最终访问效果

- 前端：`https://xxx.pages.dev`（Cloudflare Pages，全球 CDN，免费）
- 后端 API：`https://api.your-domain.com`（阿里云 ECS）
- 短链跳转：`https://api.your-domain.com/s/abc123` 跳转到原始 URL

### 8.2 这次实战你学到了什么

| 技能 | 内容 |
| --- | --- |
| 需求驱动开发 | 先写需求文档，再让 AI 生成代码，而不是从代码开始想 |
| Agent 生成骨架 | 一次性生成完整项目结构，不需要手动创建文件 |
| 迭代式完善 | 分轮次完善前端 UI 和后端 API，每次只聚焦一个问题 |
| 前后端分离部署 | 静态前端用 CDN（Cloudflare Pages），动态后端用云服务器（ECS） |
| 跨域问题解决 | CORS 配置，让前后端在不同域名下正常通信 |

### 8.3 扩展方向

用 Cursor 继续对话，可以做到：

- **加用户认证**：「帮我加一个简单的 API Key 认证，在请求头里带 `X-API-Key`，不匹配就返回 401」
- **加统计图表**：「帮我在管理页面加一个折线图，显示每天的点击趋势（用 Chart.js）」
- **换数据库**：「把 SQLite 换成 PostgreSQL，我已经在 ECS 上装好了 PostgreSQL 并创建了 `shortlink` 数据库」
- **加自定义域名**：「帮我把 Cloudflare Pages 绑定到 `link.your-domain.com` 子域名」

---

## 相关教程

- [Cursor 完整指南（注册 / 模型 / Agent）](../cursor-guide.md)
- [Cursor + GitHub Pages 建站实战（前端部署前置）](./cursor-build-static-site.md)
- [Cursor SSH 远程开发](./cursor-ssh-linux.md)
- [Cursor + 阿里云 ECS 部署（后端部署前置）](./cursor-aliyun-deploy.md)

---

## 官方来源与声明

最后核验：**2026-09-03**

- [Cursor Agent](https://cursor.com/docs/agent)
- [Prompting Agents](https://cursor.com/docs/agent/prompting)
- [Run Modes](https://cursor.com/docs/agent/security/run-modes)

本文为原创实战教程，非 Cursor、Cloudflare 或阿里云官方文档；内容曾由 AI 辅助校对；发布前应由维护者依据官方资料完成人工复核。部署前请审阅 Agent 的文件修改和命令，并以各平台当前文档为准。
