# SEO / GEO 内容规范

本文档是本仓库 SEO 相关规则的唯一权威来源，供协作者在撰写/编辑文章、修改 SEO 相关组件时对照。规则数值与
`scripts/check-seo.js` 中的 `RULES` 常量保持一致——**修改规则数值请只在 `scripts/check-seo.js` 里改，然后同步更新本文档**，
不要让两处出现不一致。

## 1. `<title>` 规则

- 显示宽度（`displayWidth`：中文/全角字符记 2，ASCII/半角字符记 1）建议区间：**50–65**。
  - `< 50`：warning，标题偏短。
  - `> 65`：warning，标题过长，搜索结果里会被截断。

## 2. `<meta name="description">` 规则

同时校验"显示宽度"和"字符数"两套区间，二者标准不同：

| 维度 | 下限 | 上限 | 低于下限 | 高于上限 |
| --- | --- | --- | --- | --- |
| 显示宽度（中文记 2，ASCII 记 1） | 140 | 320 | error | warning |
| 字符数（`.length`，中文/ASCII 均记 1） | 70 | 160 | warning | warning |

- 显示宽度低于 140 是 **error**（会阻断 `npm run check-seo` 的退出码，`--strict` 之外也算 error）；其余越界情况都是 warning。
- 字符数区间是**为中文而不是英文设计的**：150–160 字符的旧规则来源于 Bing Webmaster Tools 对英文摘要的建议，但本站读者是中文用户，
  Google 中文搜索结果的摘要通常只显示约 70–80 个汉字，160 字符的旧下限有将近一半内容永远不会被展示。因此：
  - 建议中文描述写 **70–110 字**，signal 密度高、不啰嗦；
  - **核心信息必须放在前 70 字以内**——这是搜索引擎最可能截断摘要的位置，70 字之后的内容更多是补充说明；
  - 160 字符仍是**硬上限**（沿用旧规则的上限，已有的、长度在 150–160 之间的文章描述不需要为了这次调整重写）。
- 注意：`src/content.config.ts` 里 `articles` collection 的 frontmatter `description` 字段 Zod schema 仍然是 `min(150).max(160)`
  ——那是对**文章正文 frontmatter** 的独立校验规则，本次只放宽了 `check-seo.js` 对**生成产物 HTML**的字符数下限（主要影响标签页/分类页
  等由代码拼装描述的页面），两者不是同一套规则，故意保持独立，不需要同步改。

## 3. 必填 meta / link 标签

每个 HTML 页面必须包含：

- `<meta name="keywords" content="...">`
- `<meta name="robots" content="...">`
- `<meta property="og:title" content="...">`
- `<meta property="og:description" content="...">`
- `<meta property="og:url" content="...">`
- `<meta property="og:image" content="...">`
- `<meta name="twitter:card" content="...">`
- `<link rel="canonical" href="...">`

缺失任意一项都是 **error**。以上标签统一由 `src/components/Seo.astro` 输出，新增页面时应该通过 `BaseLayout`/`Seo` 组件传入
`title`/`description`/`keywords`/`image` 等 props，不要在页面里手写重复的 meta 标签。

## 4. JSON-LD 结构化数据

- 每个页面必须至少包含 1 个 `<script type="application/ld+json">` 块，否则报 error。
- 例外：`<meta name="robots">` 内容包含 `noindex` 的页面（例如 `404.html`）不要求结构化数据，因为不会被搜索引擎收录。
- 当前 `Seo.astro` 会按页面类型输出：
  - 首页（`isHome`）→ `WebSite`
  - 文章页（传入 `article` prop）→ `Article`
  - 有 `breadcrumbs` 的页面 → `BreadcrumbList`

## 5. 内链：最终必须是站内路径，不是 `.md` 文件名

- 文章 Markdown 源文件里可以继续沿用 GitHub 浏览习惯，写相对 `.md` 链接，例如
  `[Codex 工作流](../codex/codex-workflow.md#先划安全边界)`。
- 构建时 `src/lib/remark-rewrite-relative-md-links.mjs` 会把这类链接自动重写成站内路径
  （如 `/codex/codex-workflow/#先划安全边界`），`cursor/README.md`、`codex/README.md` 会映射到对应分类落地页
  （`/cursor/`、`/codex/`），仓库根目录 `README.md` 映射到 `/`。
- 因此**不要在 Markdown 里手写站点绝对域名**（如 `https://www.aixiaobai168.com/xxx/`）来做内链——那样不仅在 GitHub 上不方便浏览，
  也绕开了这层自动重写，一旦站点域名调整就需要逐篇改文章。写相对 `.md` 路径，交给构建期插件处理即可。
- `npm run check-links`（`scripts/check-internal-links.mjs`）会在构建产物 `dist/` 里校验所有 `href="/..."` 内链，
  确认目标文件（含锚点 `id`）真实存在；`npm run check-seo` 会在全站扫描时自动调用它。

## 6. Frontmatter 必填字段

文章 collection（`articles`，见 `src/content.config.ts`）的 Zod schema：

| 字段 | 类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | 必填 | 文章标题 |
| `description` | `string`，长度 150–160 | 必填 | 与第 2 节的 meta description 字符数规则一致 |
| `pubDate` | 日期（`z.coerce.date()`） | 必填 | 首次发布日期 |
| `updatedDate` | 日期 | 可选 | 有实质性修订时填写 |
| `category` | `"cursor" \| "chatgpt" \| "codex" \| "extras"` | 必填 | 决定路由前缀与分类落地页归属 |
| `tags` | `string[]`，1–5 个 | 必填 | 用于生成 `/tags/<tag>/` 标签页 |
| `draft` | `boolean`，默认 `false` | 可选 | `true` 时不会生成路由、不进 sitemap（详见第 8 节） |
| `order` | `number` | 可选 | 分类落地页内的排序权重 |
| `reviewedBy` | `string` | 可选 | 人工复核人 |
| `reviewedAt` | 日期 | 可选 | 人工复核日期 |
| `reviewNotes` | `string[]` | 可选 | 复核提示，见第 7 节 |

`sectionIntros` collection（`cursor/README.md`、`codex/README.md` 两个目录导览文件）没有独立 frontmatter 要求（`schema: z.object({})`）。

## 7. Affiliate（联盟/推广）链接

- 命中 `src/lib/affiliate-domains.mjs` 里 `AFFILIATE_LINK_RULES` 列表的链接域名（目前只有 `cursor.com` 的 `/referral` 路径），
  会被 `src/lib/remark-affiliate-disclosure.mjs` 在构建期自动处理，**不需要在 Markdown 里手动加任何标记**：
  - 自动补上 `rel="sponsored nofollow noopener"` 与 `target="_blank"`（Google 要求付费/联盟链接必须声明 `sponsored`）。
  - 自动在链接后插入一个不可编辑的披露徽章：`<span class="affiliate-badge">推广链接</span>`。
- 新增联盟域名时，直接在 `AFFILIATE_LINK_RULES` 数组里追加一条 `{ hostname, pathPrefix? }` 规则即可，不用改 Markdown 正文。

## 8. `reviewNotes` 仅开发环境可见

- `reviewNotes` 用于记录"哪一句、为什么存疑、需要核对什么"，供维护者人工复核参照，**不代表内容已确认有误**。
- 渲染逻辑在 `src/layouts/ArticleLayout.astro`：只有 `import.meta.env.DEV` 为真（本地 `astro dev`）时才输出提示框；
  `npm run build`（生产构建）永远不会把 `reviewNotes` 渲染进 HTML，避免向读者/搜索引擎传递"内容未核完"的负面信号。
- 不要在 `reviewNotes` 里虚构"已人工核实"之类的结论——它只是待核对清单，真正完成人工复核后应该更新 `reviewedBy`/`reviewedAt`
  并考虑清空/精简对应条目。

## 9. draft 文章

- `draft: true` 的文章不会生成路由：`src/pages/[...slug].astro`、分类落地页、标签页的 `getCollection` 调用都用
  `!data.draft` 过滤，因此不会出现在 `dist/`、sitemap 或本站任何列表里。
- `npm run check-seo` 会额外做"draft 泄漏"兜底检查：扫描源 Markdown 里 `draft: true` 的文章，确认它们在 `dist/` 里确实没有
  对应的 `index.html`；如果检测到泄漏（正常情况下不会发生），会报 error。

## 10. 稀薄标签页 noindex 与 sitemap 剔除

标签页（`/tags/<tag>/`）数量会随文章数量线性增长，但大部分标签下往往只挂了 1 篇文章——这类"稀薄内容"页面
被搜索引擎大量收录会造成索引膨胀，稀释站点整体权重。规则：

- 阈值常量 `TAG_INDEX_MIN_ARTICLES`（当前 `3`）定义在 `src/lib/tag-stats.mjs`，`astro.config.mjs`（sitemap
  `filter`）与 `src/pages/tags/[tag].astro`（页面 `robots` 判断）共用同一份统计逻辑与阈值，避免两处规则出现分歧。
- 标签下**非 draft 文章数 < 阈值**：页面输出 `<meta name="robots" content="noindex, follow">`，且对应 URL
  从 `dist/sitemap-0.xml` 里剔除。
- 标签下文章数 **≥ 阈值**：保持 `index, follow`，正常出现在 sitemap 里。
- `/tags/` 标签索引页本身不受这条规则影响，始终 `index, follow` 且始终在 sitemap 里。
- `check-seo.js` 对 `robots` 的取值本身没有做"必须是 `index, follow`"的强校验（只检查该 meta 标签存在），
  所以这条规则不需要放宽 check-seo 的断言；但如果未来给 `robots` 加值校验，需要显式允许 `noindex, follow`
  这个取值出现在标签页上。

## 11. 如何本地运行检查

```powershell
npm run build        # astro check && astro build，先产出 dist/
npm run check-seo     # 校验 dist/ 下全部 HTML 的 meta/JSON-LD + 断链 + 重复 title + draft 泄漏
```

常用参数：

- `npm run check-seo -- --file dist/index.html`：只检查单个文件的 meta 规则（跳过断链等全站检查）。
- `npm run check-seo -- --strict`：warning 也按非 0 退出码处理（本地想更严格自查时用；CI 里不加，warning 不阻断）。
- `npm run check-seo -- --json`：输出 JSON，便于脚本化处理或接入其他工具。

内链单独校验：

```powershell
npm run check-links   # 等价于 check-seo 里调用的断链检查，可单独跑
```

CI（`.github/workflows/ci.yml`）在每次 PR 和推送到 `main`/`feat/**` 时会自动跑 `build` → `check-links` → `check-seo`。
