# 站点配置说明（SETUP）

本文件汇总本次 SEO 基建 / 变现适配层改造后，**需要站长本人到对应平台申请、获取凭证后再填入**的环境变量和文件。
仓库代码里只搭好了"接入点"，不包含任何真实密钥、token 或 Publisher ID。

所有环境变量都以 `PUBLIC_` 开头（Astro/Vite 约定：这个前缀的变量会被打进客户端可见的构建产物里，
不要把它当作服务端密钥使用；本项目里用到的几个变量本身也都是"公开可见"性质的 ID/token，没有敏感权限）。

## 环境变量清单

| 变量名 | 用途 | 未设置时的行为 |
|---|---|---|
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Google Search Console 站点所有权验证 | `<head>` 里不渲染对应 meta 标签，不报错 |
| `PUBLIC_CF_BEACON_TOKEN` | Cloudflare Web Analytics 的 beacon token | 不注入任何分析脚本 |
| `PUBLIC_ADS_ENABLED` | 广告适配层总开关，设为 `true` 才会尝试展示广告位 | 广告位保持空白占位，不加载任何广告脚本 |

本地开发时可以复制 `.env.example` 为 `.env` 并填入真实值（`.env` 已在 `.gitignore` 里排除，不会被提交）。
线上部署（Cloudflare Pages）时，在项目的 **Settings → Environment variables** 里配置同名变量即可，Production/Preview 环境可以分别设置。

---

## 1. Google Search Console 站点验证

1. 打开 [Google Search Console](https://search.google.com/search-console)，添加资源 `https://www.aixiaobai168.com`（选择"网址前缀"类型）。
2. 验证方式选择 **HTML 标记（meta tag）**，Google 会给出一段形如：
   ```html
   <meta name="google-site-verification" content="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />
   ```
   只需要把 `content` 里的那一串值填进环境变量：
   ```
   PUBLIC_GOOGLE_SITE_VERIFICATION=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
3. 重新部署站点后，回到 Search Console 点"验证"。
4. 验证通过后，记得在 Search Console 里提交 sitemap：`https://www.aixiaobai168.com/sitemap-index.xml`。

> 备注：Bing 站长工具的验证文件（`BingSiteAuth.xml`）和 IndexNow key 文件已经从旧站原样迁移到 `public/`，
> 构建后会出现在 `dist/` 根目录，**不需要重新申请**，Bing 那边的站点验证和 IndexNow 推送应该能延续。

## 2. Cloudflare Web Analytics

1. 登录 Cloudflare Dashboard，进入 **Analytics & Logs → Web Analytics**（或者直接在 Pages 项目里找到 "Web Analytics" 入口）。
2. 点 "Add a site"，站点填 `www.aixiaobai168.com`，Cloudflare 会生成一段 JS 片段，形如：
   ```html
   <script defer src='https://static.cloudflareinsights.com/beacon.min.js'
     data-cf-beacon='{"token": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"}'></script>
   ```
   只需要把 `token` 的值填进环境变量：
   ```
   PUBLIC_CF_BEACON_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
3. 重新部署后，本站会在**访客同意 Cookie 提示后**才动态加载这段官方 beacon 脚本（逻辑见 `src/components/Analytics.astro`）。
4. 因为 Cloudflare Web Analytics 本身不用 Cookie，理论上不需要同意也能合规使用；这里仍然接到同意状态门控只是为了统一体验、把"同意=可以做一切追踪相关的事"讲清楚，你也可以按自己的判断放宽。

## 3. Google AdSense（如决定启用）

> 提醒：`adsense.googleapis.com` 和 AdSense 依赖的 `google.com/recaptcha/api2/aframe` 在中国大陆网络环境下常规不可达，
> 大陆访客即使开启广告也大概率看不到广告内容（表现为空白占位，不会报错或塌陷布局）。广告更适合面向海外中文流量。

1. 到 [Google AdSense](https://www.google.com/adsense/) 用你的站点域名申请账号并通过审核。
2. 审核通过后，AdSense 后台"账号 → 账号信息"页面会显示你的 **Publisher ID**，格式类似 `pub-1234567890123456`。
3. 打开仓库的 `public/ads.txt`，把注释里的示例行取消注释，并把 `pub-0000000000000000` 换成你的真实 Publisher ID：
   ```
   google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
   ```
4. 设置环境变量 `PUBLIC_ADS_ENABLED=true` 打开广告适配层总开关。
5. 当前 `src/components/AdSlot.astro` 只搭了骨架（固定尺寸容器 + 占位文案），**没有接入 AdSense 官方 `<ins class="adsbygoogle">` 单元和 loader 脚本**。
   真正上线广告还需要：
   - 在 `AdSlot.astro` 里把 `data-ad-placeholder` 对应的占位 `<div>` 换成真实的 `<ins class="adsbygoogle" data-ad-client="ca-pub-xxxx" data-ad-slot="xxxx" ...>`；
   - 在页面 `<head>`（参考 `Analytics.astro` 的同意门控写法）追加 AdSense 官方 loader `<script>`，同样应该只在访客同意 Cookie 后加载；
   - 如果要真正区分大陆/海外流量，需要实现 `src/lib/ad-provider.ts` 里 `getAdProvider()` 函数顶部 TODO 注释描述的地域判断逻辑（例如读取 Cloudflare 的 `request.cf.country`）。
6. 大陆流量的广告渠道目前没有接入（`getAdProvider()` 对非 AdSense 场景固定返回 `"none"`），如果后续要接入国内广告联盟，在这个函数里加一个新的分支返回值即可，`AdSlot.astro` 的容器结构不需要改。

---

## 部署检查清单（每次改动环境变量后）

1. 在 Cloudflare Pages 项目的 Environment variables 里确认变量已经按 Production/Preview 分别配置。
2. 触发一次新的部署（环境变量修改后需要重新构建才会生效，Astro 是在构建期把 `import.meta.env.PUBLIC_*` 内联进产物的，不是运行时读取）。
3. 部署完成后，用浏览器"查看网页源代码"确认对应 `<meta>` / `<script>` 是否按预期出现或缺失。

## 相关脚本

- `npm run build`：构建静态站点到 `dist/`。
- `npm run check-seo`：检查 `dist/` 下全部页面的 SEO meta（title/description 宽度、必填 meta、结构化数据）、断链、重复标题、draft 泄漏。
- `npm run check-links`：只跑站内断链检查（`check-seo` 内部也会调用它）。
- `npm run indexnow-submit`：向 IndexNow 推送 `dist/sitemap-index.xml` 里的全部 URL（需要先 `npm run build`）。
