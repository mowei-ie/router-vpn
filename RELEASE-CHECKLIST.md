# 上线操作清单（需账号权限，手动执行）

> 本文件汇总所有需要 Cloudflare / GitHub 账号权限才能完成的操作。代码类工作已通过 PR 分支推送，不在此清单内。请按顺序执行，每完成一项就打勾。

## 1. Cloudflare Pages 核实（对应计划步骤 1）

本机网络环境异常：`aixiaobai168.com`（裸域）本地 DNS 解析到 `198.18.0.254`，`www.aixiaobai168.com` 解析到 `198.18.0.70`——这两个地址都属于 RFC 2544 基准测试保留段（`198.18.0.0/15`），不是真实可路由地址，说明本机存在代理/DNS 劫持工具，探测结果不可信。请在 Cloudflare 控制台直接确认：

- [ ] 登录 Cloudflare Dashboard → Pages → 找到对应项目，记录当前 **Build command** 与 **Build output directory**（预期为空/`docs`，需改为新 Astro 站点的产物目录，通常是 `dist`）。
- [ ] 确认部署方式：Git 集成自动部署，还是 Direct Upload（`wrangler pages deploy`）。这决定后续 cutover 怎么触发。
- [ ] Cloudflare Dashboard → DNS，确认裸域 `aixiaobai168.com` 是否有到 `www.aixiaobai168.com` 的重定向规则（Redirect Rules 或 Page Rules），没有则需新增 301。
- [ ] 确认主域最终选定：本计划固定 `https://www.aixiaobai168.com` 为 canonical 主域。

## 2. 关闭 GitHub Pages（对应计划步骤 1）

`wybzsngw/router-vpn` 当前 `has_pages=true`，`https://wybzsngw.github.io/router-vpn/` 返回 200，与自有域名重复。

- [ ] GitHub 仓库 → Settings → Pages → Source 改为 **None**（或删除 Pages 构建来源）。
- [ ] 确认 `wybzsngw.github.io/router-vpn/` 之后返回 404。

## 3. Cutover：切换 Cloudflare Pages 构建产物（对应计划步骤 4，严禁提前做）

**必须等 PR `feat/site-relaunch` 合并、且新站在 Cloudflare Pages 预览环境验收通过后再执行**，顺序颠倒会导致 `www.aixiaobai168.com` 立刻下线（因为域名现在就是从 `docs/` 提供服务的）。

- [ ] 确认新站在 Pages 的 Preview 部署地址上访问正常（导航、文章页、SEO meta、广告位占位都正常）。
- [ ] Cloudflare Pages 项目设置里将 Build output directory 改为新产物目录（如 `dist`），Build command 改为 `npm run build`（以实际 `package.json` 为准）。
- [ ] 触发一次生产部署，访问 `https://www.aixiaobai168.com/` 确认是新站而不是旧的“服务已暂停”页。
- [ ] 确认无误后，回到本仓库执行下面第 5 项的“归档 docs/”合并。

## 4. 仓库改名（对应计划步骤 6）

新名称已确定：**`ai-tools-guide`**。

- [ ] GitHub 仓库 → Settings → 顶部 Repository name 改为 `ai-tools-guide`。
- [ ] 改名后确认：旧地址 `github.com/wybzsngw/router-vpn` 自动 301 到新地址（网页、`git clone`、`git remote -v` 均可验证）。
- [ ] **重要**：此后不要在同一账号下新建名为 `router-vpn` 的仓库，否则旧地址的自动重定向会立刻失效。
- [ ] 改名后请在本地执行一次 `git remote set-url origin https://github.com/wybzsngw/ai-tools-guide.git`（虽然旧地址仍可用，但建议同步更新，避免以后混淆）。
- [ ] 检查仓库描述（Settings → General → Description），当前仍是 VPN/路由器方向文案，改为反映 AI 工具教程定位的描述（PR 中会同步更新 README 内的相关表述，仓库描述字段需在网页手动改）。

## 5. 归档 `docs/`（对应计划步骤 4，须在第 3 项完成后再做）

- [ ] 确认第 3 项 Cutover 已完成且生产环境稳定运行新站至少 24 小时。
- [ ] 执行（本地已准备好 `legacy-site` 分支，包含改动前的完整 `docs/` 快照，直接推送即可）：
  ```powershell
  git push origin legacy-site
  git tag legacy-site-final legacy-site
  git push origin legacy-site-final
  ```
- [ ] 合并移除 `docs/` 的 PR（会在代码 PR 中一并提交，标注等 Cutover 完成后再合并）。

## 6. 广告平台申请（对应计划步骤 7、8，内容量与人工复核达标后再做）

- [ ] 确认 `content-growth` 待办中的人工复核清单已全部完成（作者信息、复核签署、内容量）。
- [ ] 提交 Google AdSense 审核（仅面向海外中文读者流量预期）。
- [ ] 提交 `ads.txt`（PR 中会生成模板，需替换为实际 Publisher ID）。
- [ ] 大陆侧广告/联盟渠道另行评估，不在本清单强制要求。

---

**状态跟踪**：完成一项打勾一项即可，不需要回复我确认每一步；全部完成后告诉我「清单已完成」，我会做最终的 launch-audit 验收。
