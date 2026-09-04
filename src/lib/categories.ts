export type Category = "cursor" | "chatgpt" | "codex" | "extras";

export interface CategoryMeta {
  slug: Category;
  label: string;
  shortLabel: string;
  description: string;
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  cursor: {
    slug: "cursor",
    label: "Cursor 专题",
    shortLabel: "Cursor",
    description: "Cursor 主指南、建站与全栈开发实战、SSH 远程开发、阿里云部署与系统运维排障。",
  },
  chatgpt: {
    slug: "chatgpt",
    label: "ChatGPT / OpenAI API",
    shortLabel: "ChatGPT",
    description: "ChatGPT 订阅方案选择、账号与账单，以及 OpenAI API 接入、密钥安全与成本控制。",
  },
  codex: {
    slug: "codex",
    label: "OpenAI Codex 专题",
    shortLabel: "Codex",
    description: "OpenAI Codex 产品入口与登录方式、CLI 上手、工程工作流、定制配置与第三方模型接入。",
  },
  extras: {
    slug: "extras",
    label: "扩展与部署",
    shortLabel: "Extras",
    description: "自建统计服务部署与 Tailscale 远程访问等扩展实践内容。",
  },
};

export const CATEGORY_ORDER: Category[] = ["cursor", "chatgpt", "codex", "extras"];
