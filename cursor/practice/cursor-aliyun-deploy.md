---
title: "Cursor + 阿里云 ECS 实战：从写代码到上线 Web 应用全流程"
description: "实战教程：用 Cursor 远程连接阿里云 ECS，从零生成 Node.js Express 应用，依次配置 Nginx 反向代理、PM2 守护进程、Let's Encrypt SSL 证书、域名解析与备案要点，并接入 GitHub Actions 实现推送后自动部署，适合个人开发者独立上线 Web 应用。"
pubDate: "2026-07-23T11:58:47+08:00"
updatedDate: "2026-09-03T15:42:03+08:00"
category: "cursor"
tags: ["Cursor", "阿里云ECS", "Nginx", "PM2", "GitHub Actions"]
draft: false
order: 4
---

# Cursor + 阿里云 ECS 实战：从写代码到上线 Web 应用全流程

> [Cursor 推广链接](https://cursor.com/referral?code=Y3RXKKUGMJ2G)：优惠与适用条件以结账页实际显示为准。

**摘要**：完整实战：用 Cursor 远程连接阿里云 ECS，让 AI 帮你写一个 Node.js Web 应用，配置 Nginx 反向代理 + PM2 守护进程 + Let's Encrypt SSL，再用 GitHub Actions 实现推送自动部署。你不需要记忆任何命令，每一步让 Cursor Agent 帮你写脚本、排查报错、检查配置。

**关键词**：Cursor 阿里云、Cursor ECS 部署、Cursor Web 应用、Cursor Node 部署、阿里云 Cursor 开发、Nginx Cursor、Let's Encrypt Cursor、Cursor GitHub Actions

---

## 一、阿里云 ECS 选型与购买

### 1.1 实例规格选择

对于个人 Web 应用（个人博客、工具站、API 服务），最入门的配置已足够：

| 配置项 | 推荐选择 | 说明 |
| --- | --- | --- |
| 实例规格 | ecs.t6-c1m2.large（2 vCPU、4 GiB）或更高 | 静态站 1 核 1G 也够，有动态逻辑建议 2 vCPU、4 GiB |
| 操作系统 | Ubuntu 22.04 LTS 64 位 | 软件包新、社区活跃，本教程基于此 |
| 系统盘 | 40 GB 高效云盘 | 个人应用足够 |
| 带宽 | 1–3 Mbps 按固定带宽，或按使用流量 | 个人用按流量计费通常更划算 |
| 安全组 | 稍后配置，先选「快速创建」 | |

**购买建议**：新用户可在阿里云官网查询「学生/新人优惠」，包年包月通常比按量更便宜。选择离目标用户最近的区域（国内访问选华东/华北，面向东南亚选新加坡）。

### 1.2 安全组配置

购买完成后，进入「云服务器 ECS → 实例 → 安全组 → 配置规则」，添加入方向规则：

| 协议 | 端口 | 来源 | 用途 |
| --- | --- | --- | --- |
| TCP | 22 | 你的本地公网 IP | SSH 登录 |
| TCP | 80 | 0.0.0.0/0 | HTTP 访问 |
| TCP | 443 | 0.0.0.0/0 | HTTPS 访问 |

**实测建议**：22 端口来源限制为你的 IP，能大幅减少暴力破解日志噪声。本地 IP 变化时进控制台调整一次即可。

### 1.3 获取 ECS 公网 IP

在 ECS 控制台「实例详情」里找到「公网 IP 地址」，格式如 `47.xxx.xxx.xxx`，后面所有操作都用这个 IP。

---

## 二、用 Cursor Remote-SSH 连接 ECS

这一步承接[实战 2《Cursor SSH 远程开发》](./cursor-ssh-linux.md)的配置方法，这里给出针对阿里云 ECS 的简洁步骤。

### 2.1 配置 SSH Key 免密登录

```bash
# 本地生成 Key（已有可跳过）
ssh-keygen -t ed25519 -C "your-email@example.com"

# 上传公钥到 ECS（替换 root 和 IP）
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@47.xxx.xxx.xxx
```

或者在阿里云控制台「密钥对」里导入你的公钥，然后绑定到实例。

### 2.2 配置本地 SSH Config

在 `~/.ssh/config` 添加：

```
Host my-ecs
  HostName 47.xxx.xxx.xxx
  User root
  IdentityFile ~/.ssh/id_ed25519
  Port 22
  ServerAliveInterval 60
```

### 2.3 在 Cursor 里连接

`Ctrl+Shift+P` → `Remote-SSH: Connect to Host` → 选 `my-ecs`。

首次连接会在 ECS 上安装 Cursor 服务端组件（约 2 分钟），之后秒连。左下角状态栏显示 `SSH: my-ecs` 即成功。

---

## 三、用 Cursor 写一个最小 Web 应用（Node.js Express）

连接 ECS 后，打开 Cursor 内置终端（`Ctrl+\``），在 ECS 上执行：

```bash
# 检查 Node.js 是否已安装
node -v
# 若未安装：
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

在 ECS 上新建项目目录：

```bash
mkdir ~/my-app && cd ~/my-app
```

在 Cursor 里打开这个目录（**文件 → 打开文件夹** → `/root/my-app`），然后从侧栏打开 Agent 并切换到 **Agent** 模式，粘贴以下提示词。若界面位置变化，请用 Command Palette 搜索 Agent：

**任务**：

> 请在当前目录生成一个最小的 Node.js + Express Web 应用：
> - `server.js`：监听 3000 端口，有 `/`（首页）和 `/api/health`（健康检查）两个路由
> - `package.json`：包含 `start` 脚本（`node server.js`）和 `dev` 脚本（`nodemon server.js`）
> - `public/index.html`：一个简洁的欢迎页面，标题写「My App」

**约束**：

> 使用 CommonJS（`require`），不用 ESM；不要引入 React/Vue 等前端框架；不要使用数据库（先跑通最小版本）

**验收**：

> `npm install && npm start` 后，`curl http://localhost:3000` 能看到 HTML，`curl http://localhost:3000/api/health` 返回 JSON `{"status":"ok"}`

Cursor 生成完成后，在终端验证：

```bash
npm install && npm start
# 另开一个终端
curl http://localhost:3000/api/health
# 期望输出：{"status":"ok"}
```

---

## 四、Nginx 反向代理配置（让 Cursor 写）

让 Cursor 直接帮你写 Nginx 配置。在 Chat 里说：

> 帮我写一个 Nginx 配置文件，把 80 端口的 HTTP 请求反向代理到本机的 3000 端口（我的 Node.js 应用）。域名暂时用 `your-domain.com`，后面会改成真实域名。先不配 HTTPS（第六章再加）。

Cursor 会生成类似下面的配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

在 Cursor 终端里安装 Nginx 并部署配置：

```bash
apt-get install -y nginx
# 把 Cursor 生成的配置写入
nano /etc/nginx/sites-available/my-app
# 粘贴配置内容，保存

ln -sf /etc/nginx/sites-available/my-app /etc/nginx/sites-enabled/
nginx -t          # 测试配置语法
systemctl reload nginx
```

验证：打开浏览器访问 `http://47.xxx.xxx.xxx`（ECS 公网 IP），能看到你的 Node.js 欢迎页即成功。

---

## 五、PM2 守护进程（让应用在后台稳定运行）

直接 `npm start` 的问题是：终端关闭后应用就停了，崩溃了也不会自动重启。PM2 解决这个问题。

在 Chat 里说：

> 帮我用 PM2 启动并守护当前目录的 Node.js 应用（入口是 server.js），然后设置开机自启。给我完整的命令序列。

Cursor 会给出类似：

```bash
npm install -g pm2
cd ~/my-app
pm2 start server.js --name my-app
pm2 startup           # 生成开机自启命令，复制并执行输出的那行 sudo 命令
pm2 save              # 保存当前进程列表
pm2 status            # 查看运行状态
```

验证：重启 ECS 后，`pm2 status` 仍显示 `my-app` 处于 `online` 状态即成功。

常用 PM2 日常命令（让 Cursor 在需要时给你提示即可）：

```bash
pm2 logs my-app        # 查看实时日志
pm2 restart my-app     # 重启
pm2 reload my-app      # 零停机热重载（适合更新代码后用）
pm2 delete my-app      # 停止并删除进程
```

---

## 六、Let's Encrypt SSL 证书（HTTPS 访问）

需要先完成第七章的域名解析，让你的域名能解析到 ECS 的公网 IP，才能申请证书。

在 Chat 里说：

> 我的域名 `your-domain.com` 已经 DNS 解析到这台 ECS 的公网 IP，帮我用 certbot 申请 Let's Encrypt SSL 证书，并自动更新 Nginx 配置为 HTTPS（80 自动跳转到 443）。给我完整命令序列。

Cursor 会给出：

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com -d www.your-domain.com
# 按提示输入邮箱，同意条款
# certbot 会自动修改 Nginx 配置并重载
```

验证：访问 `https://your-domain.com`，浏览器地址栏显示锁头图标即成功。

Let's Encrypt 证书有效期较短。通过系统包安装的 certbot 通常会配置 systemd timer 或 cron 续期机制，但应主动验证，而不是假设它一定生效：

```bash
certbot renew --dry-run   # 测试续期是否正常
```

---

## 七、域名解析与备案要点

### 7.1 域名解析到 ECS

在你的 DNS 服务商（Cloudflare / 阿里云 DNS / 腾讯云 DNSPod）添加：

| 记录类型 | 名称 | 内容 | 代理状态 |
| --- | --- | --- | --- |
| A | @ | ECS 公网 IP | 仅 DNS（关闭 CDN 代理） |
| A | www | ECS 公网 IP | 仅 DNS |

DNS 生效通常在 5 分钟到 1 小时内完成。

### 7.2 备案（仅限国内服务器）

如果 ECS 位于**中国大陆区域**并通过域名提供互联网信息服务，通常需要按适用法规和云厂商接入要求完成 ICP 备案。主体、服务类型和地区会影响具体手续，请以工信部及阿里云当前说明为准。

备案流程：

1. 进入阿里云「ICP 备案」控制台
2. 按提示填写网站信息、主办单位信息
3. 上传身份证正反面照片
4. 等待初审（1–3 工作日）→ 管局审核（通常 3–20 工作日）
5. 审核通过后会下发备案号，加入网站底部

备案期间能否开放服务以及接入要求，以主管部门和云厂商当前规则为准；不要依据本文安排生产上线时间。

**实测建议**：个人站备案流程不复杂，信息准确的情况下 1–2 周可完成。域名注册人和备案主体须保持一致。

---

## 八、GitHub Actions 自动部署（推代码自动上线）

配好这个之后，你只需要在本地改代码 → 推送 GitHub → ECS 自动拉取并重启，不需要再手动 SSH 上去操作。

### 8.1 在 ECS 上配置 SSH 密钥对（让 GitHub Actions 能 SSH 进来）

在 ECS 上生成一对专用于 CI 的 Key（在 ECS 终端执行）：

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github-actions -N ""
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github-actions      # 复制私钥内容备用
```

### 8.2 在 GitHub 仓库配置 Secrets

进入 GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加：

| Secret 名称 | 值 |
| --- | --- |
| `ECS_HOST` | ECS 公网 IP |
| `ECS_USER` | root |
| `ECS_SSH_KEY` | 上一步复制的私钥完整内容 |

### 8.3 让 Cursor 生成 Workflow 文件

在 Cursor Agent 里说：

> 帮我在 `.github/workflows/deploy.yml` 生成一个 GitHub Actions 工作流，实现：
> 推送到 `main` 分支时，SSH 登录到生产服务器（用 Secrets 里的 `ECS_HOST`、`ECS_USER`、`ECS_SSH_KEY`），在 `/root/my-app` 目录执行：`git pull && npm install && pm2 reload my-app`。

Cursor 会生成 `deploy.yml`。提交并推送到 GitHub 后，在 **Actions** 标签里看到 workflow 运行成功（绿色对勾）即完成。

**验证**：本地改一行代码（如修改欢迎语），commit 推送，等 1–2 分钟后访问你的网站，看到新内容即自动部署成功。

---

## 相关教程

- [Cursor 国内使用完整教程（注册 / 模型 / Agent）](../cursor-guide.md)
- [Cursor SSH 远程开发（本教程的前置基础）](./cursor-ssh-linux.md)
- [Cursor + GitHub Pages 上线静态站](./cursor-build-static-site.md)

---

## 官方来源与声明

最后核验：**2026-09-03**

- [Cursor Agent](https://cursor.com/docs/agent)
- [Prompting Agents](https://cursor.com/docs/agent/prompting)
- [Agent Security](https://cursor.com/docs/agent/security)

本文为原创实战教程，非 Cursor、阿里云、GitHub、Nginx 或 Let's Encrypt 官方文档；内容曾由 AI 辅助校对；发布前应由维护者依据官方资料完成人工复核。云产品规格、备案要求和部署命令应在执行前按各自官方文档再次确认。
