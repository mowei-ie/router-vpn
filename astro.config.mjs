// @ts-check
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { unified } from "@astrojs/markdown-remark";

import remarkStripFirstHeading from "./src/lib/remark-strip-first-heading.mjs";
import remarkRewriteRelativeMdLinks from "./src/lib/remark-rewrite-relative-md-links.mjs";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: "https://www.aixiaobai168.com",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    // Astro 7 默认使用 Sätteri 处理器；显式切回基于 unified/remark 的处理器，
    // 才能挂载我们的自定义 remark 插件（.md 内链重写 + 去重首个 H1）。
    processor: unified({
      remarkPlugins: [
        [remarkRewriteRelativeMdLinks, { rootDir }],
        remarkStripFirstHeading,
      ],
    }),
  },
});
