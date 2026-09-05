import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { SITE_DESCRIPTION, SITE_NAME } from "../lib/site";

export async function GET(context: APIContext) {
  const articles = await getCollection("articles", ({ data }) => !data.draft);

  const sorted = [...articles].sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );

  return rss({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    site: context.site!,
    // @astrojs/rss 本身不提供 language 选项，用 customData 直接输出 <language> 标签。
    customData: "<language>zh-CN</language>",
    items: sorted.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      // 与 Seo.astro 的 canonicalUrl 拼接方式一致：相对路径 + Astro.site，
      // 由 trailingSlash: "always" 保证输出带尾斜杠的链接。
      link: new URL(`/${entry.id}/`, context.site).toString(),
      categories: [entry.data.category, ...entry.data.tags],
    })),
  });
}
