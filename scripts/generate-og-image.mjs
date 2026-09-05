#!/usr/bin/env node
/**
 * generate-og-image.mjs
 *
 * 生成 public/og-default.png（1200×630，站点默认 OG/Twitter 分享卡片配图）。
 *
 * 背景：public/og-default.svg 是老的默认配图，但 Twitter/Facebook/微信等抓取分享卡片的爬虫
 * 基本不支持直接渲染 SVG，需要 PNG/JPEG。本脚本把同样的视觉设计（渐变背景 + 站点名 + 副标题 +
 * 站点域名）用 sharp 直接合成为 PNG，不依赖读取/解析现有的 og-default.svg 文件。
 *
 * 之所以“直接合成”而不是“读取 og-default.svg 再转码”：现有 og-default.svg 里的中文文本历史上
 * 被某个工具以错误编码写入过（不是合法 UTF-8），直接转码会把损坏的文本也一起转过去；这里用脚本
 * 内联的正确 UTF-8 字符串重新构建同款视觉设计，视觉上与原 SVG 一致（同一渐变配色、同样的三行文案
 * 布局），但文本是正确的。
 *
 * 用法：
 *   node scripts/generate-og-image.mjs
 *
 * 输出的 public/og-default.png 需要被提交进仓库（不是构建期产物，build 流程不会重新生成它）。
 * 本脚本只是保留一份“如何复现这张图”的可运行记录，方便未来改文案/改配色时重新生成。
 *
 * 依赖：sharp（Astro 自身依赖，node_modules/sharp 已存在，无需额外安装）。
 * 渲染文字依赖系统安装的中文字体（Windows 自带 Microsoft YaHei / PingFang SC 等），
 * 在没有安装对应字体的极简 Linux CI 环境上直接跑这个脚本可能会缺字——这也是为什么生成好的
 * PNG 要直接提交进仓库，而不是放进 npm run build 的构建流程里。
 */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(repoRoot, "public", "og-default.png");

const WIDTH = 1200;
const HEIGHT = 630;

// 与 og-default.svg 保持一致的渐变配色（#0284c7 -> #4338ca）与文案分层：
// 站点名（大字）/ 专题范围（中字）/ 站点域名（小字），只是把损坏的文本换成正确的 UTF-8 字符串。
// 站点名与 src/lib/site.ts 里的 SITE_NAME 保持一致，改站名时两处都要同步改。
const SITE_NAME = "AI 编程实战教程";
const SUBTITLE = "Cursor · ChatGPT · OpenAI API · OpenAI Codex";
const SITE_URL_TEXT = "www.aixiaobai168.com";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#4338ca" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />
  <text x="80" y="280" font-family="'Microsoft YaHei','PingFang SC','Segoe UI',sans-serif" font-size="72" font-weight="700" fill="#ffffff">${SITE_NAME}</text>
  <text x="80" y="350" font-family="'Microsoft YaHei','PingFang SC','Segoe UI',sans-serif" font-size="34" fill="#e0f2fe">${SUBTITLE}</text>
  <text x="80" y="560" font-family="'Microsoft YaHei','PingFang SC','Segoe UI',sans-serif" font-size="26" fill="#bae6fd">${SITE_URL_TEXT}</text>
</svg>`;

async function main() {
  await sharp(Buffer.from(svg))
    .resize(WIDTH, HEIGHT)
    .png({ compressionLevel: 9, palette: true })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  const { size } = await import("node:fs").then((fs) => fs.promises.stat(outPath));

  console.log(`已生成: ${path.relative(repoRoot, outPath)}`);
  console.log(`尺寸: ${meta.width}x${meta.height}`);
  console.log(`大小: ${(size / 1024).toFixed(1)} KB`);

  if (meta.width !== WIDTH || meta.height !== HEIGHT) {
    throw new Error(`尺寸不符合预期：期望 ${WIDTH}x${HEIGHT}，实际 ${meta.width}x${meta.height}`);
  }
  if (size > 200 * 1024) {
    console.warn(`警告：文件大小 ${(size / 1024).toFixed(1)} KB 超过 200KB 目标`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
