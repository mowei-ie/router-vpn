#!/usr/bin/env node
/**
 * SEO/GEO meta 自检脚本
 *
 * 校验 dist/**\/*.html（构建产物）是否符合站点的 SEO meta 规范：
 *   1. <title>            显示宽度 50-65（超出会被搜索结果截断）
 *   2. <meta description> 同时满足：
 *      - 显示宽度 150-320（避免中文摘要过短或过长）
 *      - 字符数 150-160（Bing Webmaster Tools Recommendations 建议区间）
 *   3. 必填 meta 标签：keywords / robots / canonical / og:* / twitter:card
 *   4. 至少存在 1 个 application/ld+json 结构化数据
 *
 * 以及站级检查（对全站扫描时才会执行，见下方 --file 说明）：
 *   5. 断链：复用 scripts/check-internal-links.mjs 的检测逻辑（作为子进程调用）
 *   6. 重复 title：多个页面标题完全相同时报 warning
 *   7. draft 泄漏：源 Markdown 中标记 draft: true 的文章，如果仍在 dist/ 里生成了对应页面，报 error
 *      （当前 Astro 路由层已经用 `!data.draft` 过滤，正常情况下这里永远不会命中，属于兜底断言）
 *
 * 用法：
 *   node scripts/check-seo.js                  # 检查 dist 下全部 HTML + 站级检查（断链/重复标题/draft 泄漏）
 *   node scripts/check-seo.js --file dist/index.html   # 只检查指定文件的 meta 规则，跳过站级检查
 *   node scripts/check-seo.js --strict         # warning 也以 exit 1 退出
 *   node scripts/check-seo.js --json           # 输出 JSON，便于 CI 集成
 *
 * 下面 RULES 里的数值、必填 meta/JSON-LD 要求等规则说明，以仓库根目录的 SEO-STANDARDS.md 为准；
 * 改动这里的数值时请同步更新那份文档，不要让两处不一致。
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const distDir = path.join(repoRoot, "dist");

const RULES = {
  titleMin: 50,
  titleMax: 65,
  descMin: 150,
  descMax: 320,
  descCharMin: 150,
  descCharMax: 160,
  requiredMeta: [
    { name: "keywords", attr: "name" },
    { name: "robots", attr: "name" },
    { name: "og:title", attr: "property" },
    { name: "og:description", attr: "property" },
    { name: "og:url", attr: "property" },
    { name: "og:image", attr: "property" },
    { name: "twitter:card", attr: "name" },
  ],
  requiredLink: ["canonical"],
};

/** 内容集合的 glob 规则，需要和 src/content.config.ts 保持一致，用于定位源 Markdown 文章。 */
const ARTICLE_SOURCES = [
  { dir: "cursor", recursive: true, excludeRootReadme: true },
  { dir: "chatgpt", recursive: false, excludeRootReadme: false },
  { dir: "codex", recursive: true, excludeRootReadme: true },
  { dir: "extras", recursive: false, excludeRootReadme: false },
];

function parseArgs(argv) {
  const args = { files: [], strict: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--file") {
      args.files.push(argv[i + 1]);
      i += 1;
    } else if (a === "--strict") {
      args.strict = true;
    } else if (a === "--json") {
      args.json = true;
    } else if (a === "-h" || a === "--help") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/check-seo.js
  node scripts/check-seo.js --file dist/index.html
  node scripts/check-seo.js --strict
  node scripts/check-seo.js --json
`);
}

/** dist/ 下这些子目录是 noindex 中转页或非页面产物，不参与 SEO meta 校验 */
const SKIP_DIRS = new Set([path.join(distDir, "go")]);

function listHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(full)) out.push(...listHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

/** 中文/全角字符按 2 计，ASCII/半角按 1 计，与 Bing/Google 显示宽度判定一致 */
function displayWidth(s) {
  let w = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code < 0x80 || (code >= 0xff61 && code <= 0xff9f)) {
      w += 1;
    } else {
      w += 2;
    }
  }
  return w;
}

/** 还原常见 HTML 实体，避免 &amp; / &#39; 等转义把字符数、显示宽度算多。 */
function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function getTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? decodeHtmlEntities(m[1].trim()) : null;
}

// 注意：属性值用反向引用匹配"开始引号"到"下一个同类型引号"，不能用 [^"']（会在内容
// 包含另一种引号时截断，例如 content="...Let's Encrypt..." 里的英文单引号）。
function getMeta(html, attr, name) {
  const re = new RegExp(
    `<meta[^>]*\\b${attr}=["']${name}["'][^>]*\\bcontent=(["'])([\\s\\S]*?)\\1`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeHtmlEntities(m[2]) : null;
}

function getLink(html, rel) {
  const re = new RegExp(
    `<link[^>]*\\brel=["']${rel}["'][^>]*\\bhref=(["'])([\\s\\S]*?)\\1`,
    "i",
  );
  const m = html.match(re);
  return m ? m[2] : null;
}

function checkFile(file) {
  const html = fs.readFileSync(file, "utf8");
  const errors = [];
  const warnings = [];

  const title = getTitle(html);
  if (!title) {
    errors.push("缺少 <title>");
  } else {
    const w = displayWidth(title);
    if (w < RULES.titleMin) warnings.push(`title 显示宽度 ${w} 偏短 (<${RULES.titleMin})`);
    if (w > RULES.titleMax) warnings.push(`title 显示宽度 ${w} 过长 (>${RULES.titleMax}, 会被截断)`);
  }

  const desc = getMeta(html, "name", "description");
  if (!desc) {
    errors.push("缺少 <meta name=description>");
  } else {
    const w = displayWidth(desc);
    const chars = desc.length;
    if (w < RULES.descMin) errors.push(`description 显示宽度 ${w} 太短 (<${RULES.descMin}, Bing 会标记)`);
    else if (w > RULES.descMax) warnings.push(`description 显示宽度 ${w} 偏长 (>${RULES.descMax})`);
    if (chars < RULES.descCharMin) warnings.push(`description 字符数 ${chars} 太短 (<${RULES.descCharMin}, Bing 会标记)`);
    else if (chars > RULES.descCharMax) warnings.push(`description 字符数 ${chars} 太长 (>${RULES.descCharMax}, Bing 会标记)`);
  }

  for (const r of RULES.requiredMeta) {
    if (!getMeta(html, r.attr, r.name)) {
      errors.push(`缺少 <meta ${r.attr}="${r.name}">`);
    }
  }
  for (const rel of RULES.requiredLink) {
    if (!getLink(html, rel)) errors.push(`缺少 <link rel="${rel}">`);
  }

  const ldJson = (html.match(/<script[^>]*type=["']application\/ld\+json["']/gi) || []).length;
  const robotsMeta = getMeta(html, "name", "robots") || "";
  const isNoindex = /noindex/i.test(robotsMeta);
  // noindex 页面（例如 404）不会被搜索引擎收录，结构化数据没有意义，不强制要求。
  if (ldJson === 0 && !isNoindex) errors.push("缺少 application/ld+json 结构化数据");

  return {
    file: path.relative(repoRoot, file).replace(/\\/g, "/"),
    title,
    titleWidth: title ? displayWidth(title) : 0,
    desc,
    descWidth: desc ? displayWidth(desc) : 0,
    descChars: desc ? desc.length : 0,
    ldJsonCount: ldJson,
    errors,
    warnings,
  };
}

/** 提取形如 "key: value" 的顶层 frontmatter 字段（本仓库 frontmatter 都是扁平结构，够用即可） */
function readFrontmatterField(mdSource, field) {
  const fmMatch = mdSource.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  const lineMatch = fm.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return lineMatch ? lineMatch[1].trim() : null;
}

function listMarkdownFiles(baseDir, recursive) {
  const out = [];
  function walk(dir, depth) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (recursive) walk(full, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        out.push(full);
      }
    }
  }
  walk(baseDir, 0);
  return out;
}

/**
 * 扫描源 Markdown 文章，找出 draft: true 的条目，并计算它们"本应不存在"的 dist 路径。
 * 路由映射规则和 astro:content glob loader 一致：<collectionDir>/<...>/<file>.md -> /<collectionDir>/<...>/<file>/
 */
function findDraftLeaks() {
  const draftRoutes = [];

  for (const source of ARTICLE_SOURCES) {
    const baseDir = path.join(repoRoot, source.dir);
    const files = listMarkdownFiles(baseDir, source.recursive);
    for (const file of files) {
      const relFromRepo = path.relative(repoRoot, file).split(path.sep).join("/");
      if (source.excludeRootReadme && relFromRepo === `${source.dir}/README.md`) continue;

      const md = fs.readFileSync(file, "utf8");
      const draftValue = readFrontmatterField(md, "draft");
      if (draftValue !== "true") continue;

      const routeId = relFromRepo.replace(/\.md$/i, "");
      const distIndexPath = path.join(distDir, ...routeId.split("/"), "index.html");
      draftRoutes.push({ source: relFromRepo, distIndexPath });
    }
  }

  const leaks = draftRoutes.filter((r) => fs.existsSync(r.distIndexPath));
  return { checked: draftRoutes.length, leaks };
}

function findDuplicateTitles(results) {
  const byTitle = new Map();
  for (const r of results) {
    if (!r.title) continue;
    if (!byTitle.has(r.title)) byTitle.set(r.title, []);
    byTitle.get(r.title).push(r.file);
  }
  const duplicates = [];
  for (const [title, files] of byTitle.entries()) {
    if (files.length > 1) duplicates.push({ title, files });
  }
  return duplicates;
}

function runLinkCheck() {
  const result = spawnSync(process.execPath, [path.join(__dirname, "check-internal-links.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return {
    exitCode: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp();

  const scopedToSingleFiles = args.files.length > 0;
  const files = scopedToSingleFiles ? args.files.map((f) => path.resolve(f)) : listHtmlFiles(distDir);

  if (!scopedToSingleFiles && files.length === 0) {
    console.error(`[error] 在 ${path.relative(repoRoot, distDir)} 下没有找到任何 HTML 文件，先运行 npm run build。`);
    process.exitCode = 1;
    return;
  }

  const results = files.map(checkFile);

  // 站级检查：只在扫描全站（未传 --file）时执行，因为断链/重复标题/draft 泄漏都依赖完整的产物集合。
  let duplicateTitles = [];
  let draftLeakResult = { checked: 0, leaks: [] };
  let linkCheck = null;

  if (!scopedToSingleFiles) {
    duplicateTitles = findDuplicateTitles(results);
    draftLeakResult = findDraftLeaks();
    linkCheck = runLinkCheck();
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          results,
          duplicateTitles,
          draftLeaks: draftLeakResult.leaks,
          draftChecked: draftLeakResult.checked,
          linkCheck,
        },
        null,
        2,
      ),
    );
  } else {
    const pad = (s, n) => String(s).padStart(n);
    console.log(`${"title".padEnd(5)} | ${"desc".padEnd(5)} | ${"chars".padEnd(5)} | status | file`);
    console.log("-".repeat(100));
    for (const r of results.sort((a, b) => a.descWidth - b.descWidth)) {
      const status = r.errors.length ? "ERROR " : r.warnings.length ? "WARN  " : "OK    ";
      console.log(`${pad(r.titleWidth, 5)} | ${pad(r.descWidth, 5)} | ${pad(r.descChars, 5)} | ${status} | ${r.file}`);
      for (const e of r.errors) console.log(`        - [error] ${e}`);
      for (const w of r.warnings) console.log(`        - [warn]  ${w}`);
    }

    const errCount = results.reduce((n, r) => n + r.errors.length, 0);
    const warnCount = results.reduce((n, r) => n + r.warnings.length, 0);
    console.log("");
    console.log(`Meta 检查：${results.length} 个文件 | errors: ${errCount} | warnings: ${warnCount}`);

    if (!scopedToSingleFiles) {
      console.log("");
      console.log("-".repeat(100));
      console.log(`重复 title：${duplicateTitles.length} 组`);
      for (const dup of duplicateTitles) {
        console.log(`  - [warn] "${dup.title}" 出现在 ${dup.files.length} 个页面：`);
        for (const f of dup.files) console.log(`      - ${path.relative(repoRoot, f).replace(/\\/g, "/")}`);
      }

      console.log("");
      console.log(
        `draft 泄漏检查：共检查 ${draftLeakResult.checked} 篇 draft 源文件，命中 ${draftLeakResult.leaks.length} 处泄漏`,
      );
      for (const leak of draftLeakResult.leaks) {
        console.log(`  - [error] ${leak.source} 标记为 draft，但仍生成了 ${path.relative(repoRoot, leak.distIndexPath).replace(/\\/g, "/")}`);
      }

      console.log("");
      console.log(`断链检查（scripts/check-internal-links.mjs）：exit code ${linkCheck.exitCode}`);
      console.log(linkCheck.output);
    }
  }

  const metaErrCount = results.reduce((n, r) => n + r.errors.length, 0);
  const metaWarnCount = results.reduce((n, r) => n + r.warnings.length, 0);
  const hasDuplicateTitleWarnings = duplicateTitles.length > 0;
  const hasDraftLeakErrors = draftLeakResult.leaks.length > 0;
  const hasLinkErrors = linkCheck ? linkCheck.exitCode !== 0 : false;

  const hasErrors = metaErrCount > 0 || hasDraftLeakErrors || hasLinkErrors;
  const hasWarnings = metaWarnCount > 0 || hasDuplicateTitleWarnings;

  if (hasErrors || (args.strict && hasWarnings)) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (e) {
  console.error(`[error] ${e.message}`);
  process.exitCode = 1;
}
