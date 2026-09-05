/**
 * tag-stats.mjs
 *
 * 标签统计模块：统计每个标签下的“非 draft”文章数，供两处共同使用：
 *   - `astro.config.mjs`（sitemap 的 `filter`）—— 在 Node 环境下加载，此时 Astro 的内容层
 *     （`astro:content`）还不可用，所以这里不走 `getCollection()`，而是用 Node `fs` 直接
 *     读取源 Markdown 文件的 frontmatter 自行统计。
 *   - `src/pages/tags/[tag].astro` —— 决定单个标签页是否应该 noindex。
 *
 * 两边统一从这份统计结果和下面的 `TAG_INDEX_MIN_ARTICLES` 阈值判断“稀薄标签”，避免规则出现分歧。
 *
 * frontmatter 解析用 `yaml` 包（Astro 自身依赖，`node_modules/yaml` 已存在），比手写正则更可靠。
 *
 * 标签 -> URL path segment 的 slug 化：与 `ArticleCard.astro` / `tags/index.astro` /
 * `tags/[tag].astro` 里生成 `href` 时使用的 `tagSlug(tag)` 保持完全一致
 * （抽出来给 `astro.config.mjs` 的 sitemap filter 共用，不再各写一份）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..", "..");

/**
 * 与 `src/content.config.ts` 里 `articles` collection 的 glob pattern 保持一致
 * （`cursor/**\/*.md` 排除 README、`chatgpt/*.md`、`codex/**\/*.md` 排除 README、`extras/*.md`）。
 */
const ARTICLE_SOURCES = [
  { dir: "cursor", recursive: true, excludeRootReadme: true },
  { dir: "chatgpt", recursive: false, excludeRootReadme: false },
  { dir: "codex", recursive: true, excludeRootReadme: true },
  { dir: "extras", recursive: false, excludeRootReadme: false },
];

/**
 * 标签页可索引（index, follow）所需的最低非 draft 文章数；低于这个数视为稀薄内容/索引膨胀，
 * 页面输出 `robots: "noindex, follow"`，并从 sitemap 里剔除（详见 SEO-STANDARDS.md）。
 */
export const TAG_INDEX_MIN_ARTICLES = 3;

/**
 * 标签字符串 -> `/tags/<slug>/` 的 URL path segment，和站内生成 href 时的写法保持一致。
 * NFKC 归一化 → trim → 小写 → 非字母数字（含 CJK）替换为 `-` → 合并/去首尾 `-`。
 * 中文标签保留汉字；不做 encodeURIComponent（浏览器/构建会自动百分号编码）。
 */
export function tagSlug(tag) {
  return tag
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function listMarkdownFiles(baseDir, recursive) {
  const out = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (recursive) walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        out.push(full);
      }
    }
  }
  walk(baseDir);
  return out;
}

function readFrontmatter(mdSource) {
  // 少数源文件历史上被 BOM 编码工具写入过 UTF-8 BOM（\uFEFF），会导致 `^---` 锚点匹配失败，
  // 这里做一次防御性剥离，不代表默许 BOM——源文件本身不受本模块管辖，不在这里修改。
  const withoutBom = mdSource.charCodeAt(0) === 0xfeff ? mdSource.slice(1) : mdSource;
  const match = withoutBom.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  try {
    return parseYaml(match[1]) ?? {};
  } catch {
    // frontmatter 解析失败时不阻断统计，当作没有 tags/draft 信息处理即可
    // （真正的 schema 校验由 astro:content 的 Zod schema 负责，这里只是辅助统计）。
    return {};
  }
}

/** 扫描全部文章源文件，返回每篇文章的 `{ tags, draft }`（仅本模块内部聚合使用）。 */
function readAllArticlesFrontmatter() {
  const results = [];
  for (const source of ARTICLE_SOURCES) {
    const baseDir = path.join(repoRoot, source.dir);
    for (const file of listMarkdownFiles(baseDir, source.recursive)) {
      const relFromRepo = path.relative(repoRoot, file).split(path.sep).join("/");
      if (source.excludeRootReadme && relFromRepo === `${source.dir}/README.md`) continue;

      const raw = fs.readFileSync(file, "utf8");
      const fm = readFrontmatter(raw);
      results.push({
        tags: Array.isArray(fm.tags) ? fm.tags : [],
        draft: fm.draft === true,
      });
    }
  }
  return results;
}

/** 统计每个标签下的非 draft 文章数，返回 `Map<tag, count>`。 */
export function getTagCounts() {
  const counts = new Map();
  for (const article of readAllArticlesFrontmatter()) {
    if (article.draft) continue;
    for (const tag of article.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

/** 文章数 < `minArticles` 的“稀薄”标签（原始标签字符串，未 slug 化），默认阈值取 `TAG_INDEX_MIN_ARTICLES`。 */
export function getThinTags(minArticles = TAG_INDEX_MIN_ARTICLES) {
  const counts = getTagCounts();
  return [...counts.entries()].filter(([, count]) => count < minArticles).map(([tag]) => tag);
}
