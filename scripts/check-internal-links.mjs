#!/usr/bin/env node
/**
 * check-internal-links.mjs
 *
 * 一个“够用”的站内链接校验脚本（非生产级 linkinator）：
 * 1. 遍历 dist/ 下全部 *.html 文件；
 * 2. 抽取所有 href="/...":（站内绝对路径）链接；
 * 3. 校验目标路径在构建产物里存在（作为目录 index.html 或直接文件）；
 * 4. 如果链接带 #anchor，进一步校验目标页面里存在对应 id="anchor"；
 * 5. 汇总报告死链，存在死链时以非 0 退出码结束，方便接入 CI。
 *
 * 用法：先执行 `npm run build`，再执行 `npm run check-links`。
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const distDir = path.join(rootDir, "dist");

const HREF_RE = /href="([^"]+)"/g;
const ID_RE = /\sid="([^"]+)"/g;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}

function isInternalPathLink(href) {
  if (!href) return false;
  if (href.startsWith("//")) return false; // protocol-relative -> external
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false; // http:, mailto:, tel: ...
  return href.startsWith("/");
}

async function resolveTargetFile(urlPath) {
  // urlPath 以 "/" 开头，可能没有结尾斜杠（如 /404、/_astro/xxx.css）
  // 静态产物里的目录名是真实 Unicode 字符（如 /tags/API密钥/），HTML 里的 href 是
  // percent-encode 过的（如 /tags/API%E5%AF%86%E9%92%A5/），托管环境会自动解码后匹配
  // 磁盘路径，这里同样需要 decode 才能正确对应到 dist/ 下的实际目录。
  let decoded = urlPath;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    // 保留原始值
  }
  const cleanPath = decoded === "/" ? "/" : decoded;
  const relative = cleanPath.replace(/^\/+/, "");

  const candidates = [];
  if (relative === "") {
    candidates.push(path.join(distDir, "index.html"));
  } else if (relative.endsWith("/")) {
    candidates.push(path.join(distDir, relative, "index.html"));
  } else {
    // 可能是不带斜杠的目录路由，也可能是静态资源文件（css/js/图片等）
    candidates.push(path.join(distDir, relative));
    candidates.push(path.join(distDir, relative, "index.html"));
    candidates.push(path.join(distDir, `${relative}.html`));
  }

  for (const candidate of candidates) {
    try {
      const s = await stat(candidate);
      if (s.isFile()) return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

async function main() {
  const htmlFiles = await walk(distDir);
  console.log(`扫描 ${htmlFiles.length} 个 HTML 文件...`);

  const idCache = new Map();
  async function getIdsOf(filePath) {
    if (idCache.has(filePath)) return idCache.get(filePath);
    const html = await readFile(filePath, "utf-8");
    const ids = new Set();
    for (const match of html.matchAll(ID_RE)) {
      ids.add(match[1]);
    }
    idCache.set(filePath, ids);
    return ids;
  }

  const problems = [];
  let totalInternalLinks = 0;

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf-8");
    const seenInFile = new Set();
    for (const match of html.matchAll(HREF_RE)) {
      const href = match[1];
      if (!isInternalPathLink(href)) continue;
      if (seenInFile.has(href)) continue;
      seenInFile.add(href);
      totalInternalLinks += 1;

      const [urlPath, hash] = href.split("#");
      const targetFile = await resolveTargetFile(urlPath || "/");

      if (!targetFile) {
        problems.push({
          from: path.relative(distDir, file),
          href,
          issue: "目标文件不存在（404）",
        });
        continue;
      }

      if (hash) {
        const ids = await getIdsOf(targetFile);
        if (!ids.has(decodeURIComponent(hash)) && !ids.has(hash)) {
          problems.push({
            from: path.relative(distDir, file),
            href,
            issue: `锚点 #${hash} 在目标页面中未找到`,
          });
        }
      }
    }
  }

  console.log(`共检查 ${totalInternalLinks} 处站内链接（已去重按文件统计）。`);

  if (problems.length > 0) {
    console.error(`\n发现 ${problems.length} 处问题：\n`);
    for (const p of problems) {
      console.error(`  [${p.from}] -> "${p.href}"：${p.issue}`);
    }
    process.exitCode = 1;
  } else {
    console.log("\n✅ 未发现死链或失效锚点。");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
