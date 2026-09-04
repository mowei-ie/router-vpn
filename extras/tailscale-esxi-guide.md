---
title: "Tailscale 使用手册（ESXi 远程访问）"
description: "在没有公网 IP 的情况下，用 Tailscale 安全访问远端 ESXi 管理界面的实用手册：给出仅发布主机 /32 路由与 Tailscale Serve 端口代理两种方案，覆盖 Rocky Linux 上的安装与登录授权、Windows 客户端配置、ACL 最小暴露原则与常见连接问题的排查思路。"
pubDate: "2026-07-23T11:58:47+08:00"
updatedDate: "2026-07-23T11:58:47+08:00"
category: "extras"
tags: ["Tailscale", "ESXi", "远程访问", "内网穿透"]
draft: false
order: 2
---

# Tailscale 使用手册（ESXi 远程访问）

目标：在没有公网 IP 的情况下，通过 Tailscale 安全访问远端 ESXi，仅暴露 ESXi 单个地址或必要端口。

- 适用系统：Rocky Linux（作为跳板/子网路由或端口代理机）、Windows 10 客户端
- 推荐阅读：
  - 安装（CentOS/Rocky 系）：[tailscale.com/download/linux/centos-8](https://tailscale.com/download/linux/centos-8)
  - Linux 转发/出口节点说明（含相关概念与注意）：[tailscale.com/kb/1103/exit-nodes?tab=linux](https://tailscale.com/kb/1103/exit-nodes?tab=linux)

---

## 一、场景与方案

- 方案 A（推荐）：仅发布 ESXi 的主机路由（/32），不暴露整个网段。适合需要直接访问 `https://ESXi_IP/`、`ssh ESXi_IP` 等场景。
- 方案 B：使用 Tailscale Serve 进行端口代理（完全不发布路由），只把 443/22/902 等端口映射到 Rocky 的 Tailscale 地址。

> 文档中的示例 ESXi 管理 IP 使用 `192.168.10.2`，请替换为你的实际地址。

---

## 二、Rocky Linux 上安装与启动

二选一：

```bash
# 方案一：官方一键安装
curl -fsSL https://tailscale.com/install.sh | sh
sudo systemctl enable --now tailscaled
```

```bash
# 方案二：使用仓库（Rocky 8；Rocky 9 将 8 改为 9）
sudo dnf config-manager --add-repo https://pkgs.tailscale.com/stable/centos/8/tailscale.repo
sudo dnf install -y tailscale
sudo systemctl enable --now tailscaled
```

参考：安装与服务启动方法见官方页面（CentOS 8）：[tailscale.com/download/linux/centos-8](https://tailscale.com/download/linux/centos-8)。

---

## 三、登录与授权

```bash
sudo tailscale up
```

- 终端会输出 `To authenticate, visit: https://login.tailscale.com/a/xxxx`，用浏览器打开并授权登录。
- 无人值守可使用 Auth Key（后台 Settings → Keys 生成）：

```bash
sudo tailscale up --authkey=tskey-xxxxxxxxxxxxxxxxxxxx
```

> 登录/授权的通用说明与网络转发相关注意可参考官方文档（Linux 选项卡）：[tailscale.com/kb/1103/exit-nodes?tab=linux](https://tailscale.com/kb/1103/exit-nodes?tab=linux)。

---

## 四、方案 A：仅暴露 ESXi 单个 IP（/32 主机路由）

1) 在 Rocky 开启内核转发（IPv4 必需，IPv6 可选）：

```bash
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
sudo sysctl -p /etc/sysctl.d/99-tailscale.conf
```

2) 广告 ESXi 的主机路由（/32），可顺便开启 Tailscale SSH（可选）：

```bash
sudo tailscale up --ssh --advertise-routes=192.168.10.2/32
```

3) 在 Tailscale 管理后台（Admin Console → Machines）为该 Rocky 设备 **Enable/Approve** 这条 `192.168.10.2/32` 路由。

4) Windows 10 客户端安装并登录同一账号，开启“接受路由”：

```powershell
tailscale set --accept-routes=true
```

5) 验证连通：

```bash
# 在 Rocky（可选）
tailscale status
tailscale ping 192.168.10.2
```

```powershell
# 在 Windows
ping 192.168.10.2
# 浏览器访问
https://192.168.10.2/
# SSH（先在 ESXi 启用 SSH 服务）
ssh root@192.168.10.2
```

> 说明：某些环境使用 firewalld 时，路由/转发可能受影响。可测试开启伪装或临时停用验证：
>
> ```bash
> sudo firewall-cmd --permanent --add-masquerade
> sudo firewall-cmd --reload
> ```
>
> 官方安装页也提示了在 firewalld 下路由特性的兼容性注意：[tailscale.com/download/linux/centos-8](https://tailscale.com/download/linux/centos-8)。

---

## 五、方案 B：端口代理（不发布任何路由）

如你只想把 ESXi 的 443/22/902 暴露给 Tailnet 内部，使用 Tailscale Serve：

```bash
# 在 Rocky 上执行，注意替换 ESXi IP
# Web 管理 443 → 8443
sudo tailscale serve tcp 8443 192.168.10.2:443
# SSH 22 → 2222
sudo tailscale serve tcp 2222 192.168.10.2:22
# VMRC 902 → 9902（可选）
sudo tailscale serve tcp 9902 192.168.10.2:902

# 停止所有映射
sudo tailscale serve reset
```

访问方式（Tailnet 内）：

- Web：`https://<rocky主机名>.tailscale.net:8443`
- SSH：`ssh -p 2222 root@<rocky主机名>.tailscale.net`
- VMRC：`<rocky主机名>.tailscale.net:9902`

---

## 六、安全与最小暴露

- 只发布 `/32` 主机路由或只代理必要端口。
- 在 ACL 中限制访问者与端口（例：仅你自己可访问 ESXi 的 22/443/902）：

```json
{
  "acls": [
    { "action": "accept", "users": ["you@example.com"], "ports": ["192.168.10.2:22,443,902"] }
  ]
}
```

- 避免使用 Funnel 将 ESXi 对公网开放。
- 开启 MagicDNS 仅在 Tailnet 内部解析，便于通过主机名访问。

---

## 七、常见问题

- 终端提示需要登录：按 `tailscale up` 输出的链接在浏览器授权，或改用 `--authkey`。
- 路由不生效：后台需要对“Subnet routes”执行 Enable/Approve；Windows 客户端也要 `--accept-routes=true`。
- firewalld 影响转发：开启 masquerade 或临时停用验证（见上文）。
- IPv6 转发警告：当前仅用 IPv4 可忽略；需要 IPv6 时开启 `net.ipv6.conf.all.forwarding=1`。
- ESXi SSH 未开：在 DCUI 或 Web 中启用 SSH 服务。

---

## 参考

- 安装（CentOS/Rocky）：<https://tailscale.com/download/linux/centos-8>
- Linux 转发/出口节点说明：<https://tailscale.com/kb/1103/exit-nodes?tab=linux>

---

如需，我可以将本手册加入项目首页或目录导航，并生成一键复制的命令清单（替换为你的实际 ESXi IP 与 Rocky 版本）。


